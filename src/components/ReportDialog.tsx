import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const REASONS = ["Spam", "Harassment or bullying", "Nudity or sexual content", "Violence", "Hate speech", "Dangerous acts", "Misinformation", "Other"];

export function ReportDialog({ videoId, open, onOpenChange }: { videoId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const submit = async () => {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({ video_id: videoId, reporter_id: user.id, reason, details });
    if (error) return toast.error(error.message);
    toast.success("Thanks, your report was sent");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report video</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn("rounded-lg border px-3 py-2 text-left text-sm", reason === r ? "border-rose bg-rose/10 font-semibold" : "hover:bg-accent")}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea placeholder="Anything else? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
        <Button variant="rose" onClick={submit}>Submit report</Button>
      </DialogContent>
    </Dialog>
  );
}
