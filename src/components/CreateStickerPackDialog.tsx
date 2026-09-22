import { useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { extFor, uploadToMedia } from "@/lib/uploads";

export function CreateStickerPackDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    const combined = [...files, ...picked].slice(0, 25);
    if (files.length + picked.length > 25) {
      toast.error("Sticker packs can have up to 25 stickers");
    }
    setFiles(combined);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Please enter a pack name"); return; }
    if (files.length === 0) { toast.error("Please add at least 1 sticker image"); return; }

    setBusy(true);
    try {
      // 1. Create the pack row
      const { data: pack, error: pErr } = await supabase
        .from("sticker_packs")
        .insert({
          name: name.trim(),
          creator_id: userId,
          is_official: false,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Upload images and insert stickers
      const stickers = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = extFor(file, "png");
        const path = await uploadToMedia(userId, file, "stickers", ext);
        stickers.push({
          pack_id: pack.id,
          storage_path: path,
          sort: i,
        });
      }

      const { error: sErr } = await supabase.from("stickers").insert(stickers);
      if (sErr) throw sErr;

      toast.success(`Pack "${name.trim()}" created!`);
      qc.invalidateQueries({ queryKey: ["sticker-packs"] });
      setOpen(false);
      setName("");
      setFiles([]);
    } catch (err) {
      toast.error((err as Error).message || "Failed to create sticker pack");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Create new sticker pack"
          className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-rose px-2.5 py-1 text-xs font-semibold text-rose transition-colors hover:bg-rose/10"
        >
          <Plus className="size-3.5" />
          <span>New</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sticker Pack</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pack-name">Pack Name</Label>
            <Input
              id="pack-name"
              placeholder="e.g. My Reactions…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Stickers ({files.length}/25)</Label>
              <label className="cursor-pointer text-xs font-semibold text-rose hover:underline">
                + Add Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickFiles}
                  disabled={files.length >= 25 || busy}
                />
              </label>
            </div>

            {files.length === 0 ? (
              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center cursor-pointer hover:bg-muted/50">
                <ImagePlus className="size-8 text-muted-foreground mb-1" />
                <span className="text-xs font-semibold text-muted-foreground">Select 1 to 25 sticker photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickFiles}
                />
              </label>
            ) : (
              <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto rounded-lg border p-2">
                {files.map((f, i) => (
                  <div key={i} className="group relative aspect-square rounded-md border bg-secondary/50 overflow-hidden">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="size-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-foreground hover:text-destructive shadow-sm"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="rose" onClick={handleCreate} disabled={busy || files.length === 0 || !name.trim()}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Create Pack
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
