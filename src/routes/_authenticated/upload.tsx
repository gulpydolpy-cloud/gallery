import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Upload as UploadIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { VideoRecorder } from "@/components/VideoRecorder";
import { VideoEditor } from "@/components/VideoEditor";
import { defaultEdit, type VideoEdit } from "@/lib/edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { parseHashtags } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Gallery" },
      { name: "description", content: "Upload or record a video for Gallery with a title, description and hashtags." },
      { property: "og:title", content: "Upload — Gallery" },
      { property: "og:description", content: "Upload or record a video for Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"pick" | "record">("pick");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [edit, setEdit] = useState<VideoEdit>(defaultEdit());
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const hashtags = parseHashtags(tags);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Videos must be under 200MB");
      return;
    }
    setBusy(true);
    setProgress(10);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const tick = setInterval(() => setProgress((p) => Math.min(p + 5, 85)), 400);
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      clearInterval(tick);
      if (upErr) throw upErr;
      setProgress(90);
      const { error } = await supabase.from("videos").insert({ user_id: user.id, title: title.trim(), description: description.trim(), hashtags, storage_path: path, edit: edit as unknown as Record<string, unknown> });
      if (error) throw error;
      setProgress(100);
      toast.success("Your video is live!");
      qc.invalidateQueries({ queryKey: ["feed"] });
      navigate({ to: "/u/$username", params: { username: profile?.username ?? "" } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-extrabold">Upload video</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {file ? (
            <div className="space-y-2">
              {preview && user && <VideoEditor src={preview} userId={user.id} edit={edit} onChange={setEdit} />}
              <Button variant="ghost" className="w-full" onClick={() => { setFile(null); setEdit(defaultEdit()); }}>
                <X /> Choose another video
              </Button>
            </div>
          ) : mode === "record" ? (
            <div className="space-y-3">
              <VideoRecorder onRecorded={setFile} />
              <Button variant="ghost" className="w-full" onClick={() => setMode("pick")}>Choose a file instead</Button>
            </div>
          ) : (
            <div className="mx-auto flex aspect-[9/16] w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 text-center">
              <UploadIcon className="size-10 text-muted-foreground" />
              <div>
                <p className="font-semibold">Select a video to upload</p>
                <p className="text-xs text-muted-foreground">MP4, WebM or MOV · up to 200MB</p>
              </div>
              <Label className="cursor-pointer rounded-full bg-rose px-5 py-2 text-sm font-semibold text-rose-foreground">
                Select file
                <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Label>
              <Button variant="outline" onClick={() => setMode("record")}><Camera /> Record in app</Button>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Give it a title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="What's this about?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Hashtags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#funny #dance #music" />
            {hashtags.length > 0 && (
              <p className="flex flex-wrap gap-1">
                {hashtags.map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">#{t}</span>)}
              </p>
            )}
          </div>
          {busy && <Progress value={progress} />}
          <Button type="submit" variant="rose" className="h-11 w-full text-base" disabled={!file || busy}>
            {busy ? "Posting…" : "Post"}
          </Button>
        </form>
      </div>
    </div>
  );
}
