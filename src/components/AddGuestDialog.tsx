import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { addGuest } from "@/lib/live";

export function AddGuestDialog({
  sessionId,
  open,
  onOpenChange,
  excludeIds,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  excludeIds: string[];
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-usernames", q],
    enabled: open,
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, username, display_name, avatar_path").order("username").limit(50);
      if (q.trim()) query = query.ilike("username", `%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = users.filter((u) => !excludeIds.includes(u.id));

  const invite = async (userId: string) => {
    setAdding(userId);
    try {
      await addGuest(sessionId, userId);
      toast.success("Added to the live");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a guest</DialogTitle>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username…" autoFocus />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && filtered.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>}
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent">
              <UserAvatar profile={u} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.display_name || u.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <Button size="sm" variant="outline" disabled={adding === u.id} onClick={() => invite(u.id)}>
                {adding === u.id ? "Adding…" : "Add"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
