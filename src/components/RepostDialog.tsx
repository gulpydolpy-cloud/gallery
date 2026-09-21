import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { repost } from "@/lib/videos";

export function RepostDialog({ videoId, userId, open, onOpenChange, onDone }: { videoId: string; userId: string; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (withNote: boolean) => {
    setBusy(true);
    try {
      await repost(videoId, userId, withNote ? note.trim() : "");
      toast.success("Reposted");
      setNote("");
      qc.invalidateQueries({ queryKey: ["feed"] });
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Repost</DialogTitle>
        </DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={3} placeholder="Add a note (optional)…" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => send(false)}>Repost</Button>
          <Button variant="rose" className="flex-1" disabled={busy || !note.trim()} onClick={() => send(true)}>Repost with note</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
