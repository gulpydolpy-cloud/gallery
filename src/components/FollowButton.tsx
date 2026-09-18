import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function FollowButton({ targetId, compact = false }: { targetId: string; compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: following } = useQuery({
    queryKey: ["following", user?.id, targetId],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("follower_id").match({ follower_id: user!.id, following_id: targetId }).maybeSingle();
      return Boolean(data);
    },
  });

  if (user?.id === targetId) return null;

  const toggle = async () => {
    if (!user) {
      toast("Log in to follow", { action: { label: "Log in", onClick: () => navigate({ to: "/auth" }) } });
      return;
    }
    if (following) await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });
    else await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    qc.invalidateQueries({ queryKey: ["following", user.id, targetId] });
    qc.invalidateQueries({ queryKey: ["profile-stats", targetId] });
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={following ? "Unfollow" : "Follow"}
        className="flex size-5 items-center justify-center rounded-full bg-rose text-rose-foreground shadow"
      >
        {following ? <Check className="size-3" /> : <Plus className="size-3" />}
      </button>
    );
  }
  return (
    <Button variant={following ? "outline" : "rose"} onClick={toggle} className="min-w-28">
      {following ? "Following" : "Follow"}
    </Button>
  );
}
