import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { conversationTitle, fetchConversations, openDirectConversation, sendMessage } from "@/lib/chat";
import type { VideoWithMeta } from "@/lib/videos";

export function ShareDialog({
  video,
  open,
  onOpenChange,
  onShared,
}: {
  video: VideoWithMeta;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onShared?: (() => void) | undefined;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: videoUrl } = useSignedUrl("videos", open ? video.storage_path : null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/video/${video.id}` : "";

  const countShare = async () => {
    try {
      await incrementShares(video.id);
      onShared?.();
    } catch {
      /* counters are best-effort */
    }
  };

  const { data: convs = [] } = useQuery({ queryKey: ["conversations", user?.id], queryFn: () => fetchConversations(user!.id), enabled: open && Boolean(user) });
  const { data: people = [] } = useQuery({
    queryKey: ["people-search", q],
    enabled: open && Boolean(user) && q.trim().length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_path").ilike("username", `%${q.trim()}%`).neq("id", user!.id).limit(10);
      return data ?? [];
    },
  });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
    await countShare();
  };

  const save = async () => {
    if (!videoUrl) return;
    setSaving(true);
    try {
      await downloadFile(videoUrl, `${(video.title || "gallery-video").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 40)}.mp4`);
      toast.success("Video saved to your device");
      await countShare();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const shareTo = async (conversationId: string) => {
    await sendMessage(conversationId, user!.id, "Shared a video", null, video.id);
    toast.success("Sent");
    await countShare();
    onOpenChange(false);
  };

  const shareToPerson = async (id: string) => {
    const cid = await openDirectConversation(user!.id, id);
    await shareTo(cid);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url} className="text-xs" />
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
            <Copy />
          </Button>
        </div>
        {user ? (
          <>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Send to someone on Gallery…" className="pl-9" />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {q.trim()
                ? people.map((p) => (
                    <Row key={p.id} title={p.display_name || p.username} sub={`@${p.username}`} avatar={<UserAvatar profile={p} size="sm" />} onClick={() => shareToPerson(p.id)} />
                  ))
                : convs.map((c) => (
                    <Row
                      key={c.id}
                      title={conversationTitle(c)}
                      sub={c.is_group ? `Group · ${c.members.length + 1} members` : "Direct message"}
                      avatar={c.members[0] ? <UserAvatar profile={c.members[0]} size="sm" /> : <div className="size-9 rounded-full bg-muted" />}
                      onClick={() => shareTo(c.id)}
                    />
                  ))}
              {!q.trim() && convs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Search for a person to send this to.</p>}
            </div>
          </>
        ) : (
          <Button variant="rose" onClick={() => navigate({ to: "/auth" })}>
            Log in to send to friends
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ title, sub, avatar, onClick }: { title: string; sub: string; avatar: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <Send className="size-4 text-rose" />
    </button>
  );
}
