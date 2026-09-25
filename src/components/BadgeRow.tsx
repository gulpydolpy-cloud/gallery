import { useUserBadges, useAllAchievements } from "@/lib/achievements";

export function BadgeRow({ userId }: { userId: string }) {
  const { data: badges = [] } = useUserBadges(userId);
  const { data: all = [] } = useAllAchievements();
  const map = new Map(all.map((a) => [a.id, a]));
  const verified = badges.some((b) => b.badge_id === "verified_creator");
  const shown = badges.filter((b) => b.displayed && b.badge_id !== "verified_creator").slice(0, 3);
  if (shown.length === 0 && !verified) return null;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {verified && <span title="Verified Creator">✅</span>}
      {shown.map((b) => (
        <span key={b.badge_id} title={map.get(b.badge_id)?.name} className="text-lg leading-none">
          {map.get(b.badge_id)?.emoji ?? "🏅"}
        </span>
      ))}
    </span>
  );
}
