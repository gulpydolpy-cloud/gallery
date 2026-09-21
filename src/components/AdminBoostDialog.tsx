import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminBoost } from "@/lib/videos";

export function AdminBoostDialog({ videoId, open, onOpenChange }: { videoId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [likes, setLikes] = useState("");
  const [views, setViews] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const l = Number(likes || 0);
    const v = Number(views || 0);
    if (!Number.isFinite(l) || !Number.isFinite(v) || (!l && !v)) return toast.error("Enter a number of likes or views");
    setBusy(true);
    try {
      await adminBoost(videoId, Math.trunc(l), Math.trunc(v));
      toast.success("Counters updated");
      setLikes("");
      setViews("");
      qc.invalidateQueries({ queryKey: ["feed"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Boost this video</DialogTitle>
          <DialogDescription>Silent — nobody is notified and no names appear in any list.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="boost-likes">Likes to add</Label>
            <Input id="boost-likes" inputMode="numeric" value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="518" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boost-views">Views to add</Label>
            <Input id="boost-views" inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="10000" />
          </div>
          <Button type="submit" variant="rose" className="w-full" disabled={busy}>{busy ? "Applying…" : "Apply"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
