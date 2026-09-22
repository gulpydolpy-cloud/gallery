import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const DURATIONS: { label: string; hours: number | null }[] = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Permanent", hours: null },
];

export function BanDialog({ user, open, onOpenChange }: { user: { id: string; username: string }; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("24");

  const submit = async () => {
    if (!me) return;
    const hours = duration === "perm" ? null : Number(duration);
    const expires_at = hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
    const { error } = await supabase.from("bans").insert({ user_id: user.id, banned_by: me.id, reason, expires_at });
    if (error) { toast.error(error.message); return; }
    toast.success(`@${user.username} banned`);
    qc.invalidateQueries({ queryKey: ["admin-bans"] });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Ban @{user.username}</DialogTitle></DialogHeader>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => <SelectItem key={d.label} value={d.hours === null ? "perm" : String(d.hours)}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea placeholder="Reason (any reason works)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="destructive" onClick={submit}>Ban user</Button>
      </DialogContent>
    </Dialog>
  );
}
