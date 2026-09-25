import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAllAchievements, useUserBadges, setProfileBadges } from "@/lib/achievements";

export function ManageBadgesDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: all = [] } = useAllAchievements();
  const { data: mine = [], refetch } = useUserBadges(userId);
  const earnedIds = new Set(mine.filter((b) => b.badge_id !== "verified_creator").map((b) => b.badge_id));
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(mine.filter((b) => b.displayed).map((b) => b.badge_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error("You can only display 3 badges");
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    try {
      await setProfileBadges(selected);
      toast.success("Badges updated");
      refetch();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const earned = all.filter((a) => earnedIds.has(a.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Choose up to 3 badges to show</DialogTitle></DialogHeader>
        {earned.length === 0 && <p className="text-sm text-muted-foreground">You haven't earned any badges yet — go get some!</p>}
        <div className="grid grid-cols-2 gap-2">
          {earned.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={`flex items-center gap-2 rounded-xl border p-2 text-left text-sm ${selected.includes(a.id) ? "border-rose bg-rose/10" : "border-border"}`}
            >
              <span className="text-xl">{a.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{a.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.description}</span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="rose" onClick={save}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
