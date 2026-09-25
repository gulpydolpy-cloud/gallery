import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  g_dollar_reward: number;
  is_admin_only: boolean;
};
export type UserBadge = { user_id: string; badge_id: string; earned_at: string; displayed: boolean };

function announce(rows: { badge_id: string; name: string; g_dollar_reward: number }[] | null | undefined) {
  for (const row of rows ?? []) {
    toast(`🏅 Badge unlocked! ${row.name}`, {
      description: row.g_dollar_reward > 0 ? `+G$${row.g_dollar_reward}` : undefined,
      duration: 4000,
    });
  }
}

/** Call after actions that could unlock a badge (follow, like, gift, upload, comment, go live…). Cheap and safe to call often. */
export async function checkAchievements(userId: string) {
  const { data, error } = await db.rpc("check_achievements", { _user_id: userId });
  if (error) return;
  announce(data as { badge_id: string; name: string; g_dollar_reward: number }[]);
}

/** Only awards if it's actually 12am–5am on the visitor's own device. */
export async function tryAwardNightOwl() {
  const hour = new Date().getHours();
  if (hour < 0 || hour > 4) return;
  const { data, error } = await db.rpc("try_award_night_owl", { _local_hour: hour });
  if (error) return;
  announce(data as { badge_id: string; name: string; g_dollar_reward: number }[]);
}

export function useAllAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => (await db.from("achievements").select("*").order("g_dollar_reward")).data as Achievement[],
  });
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-badges", userId],
    enabled: Boolean(userId),
    queryFn: async () => (await db.from("user_badges").select("*").eq("user_id", userId)).data as UserBadge[],
  });
}

export async function setProfileBadges(badgeIds: string[]) {
  const { error } = await db.rpc("set_profile_badges", { _badge_ids: badgeIds });
  if (error) throw new Error((error as Error).message);
}

export async function adminGrantBadge(targetUserId: string, badgeId: "rose_vip" | "verified_creator") {
  const { error } = await db.rpc("admin_grant_badge", { _target: targetUserId, _badge_id: badgeId });
  if (error) throw new Error((error as Error).message);
}
export async function adminRevokeBadge(targetUserId: string, badgeId: string) {
  const { error } = await db.rpc("admin_revoke_badge", { _target: targetUserId, _badge_id: badgeId });
  if (error) throw new Error((error as Error).message);
}
