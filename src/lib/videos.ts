import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Video = Tables<"videos">;
export type ProfileLite = Pick<Tables<"profiles">, "id" | "username" | "display_name" | "avatar_path">;

export type VideoWithMeta = Video & {
  profile: ProfileLite;
  like_count: number;
  comment_count: number;
  save_count: number;
  liked: boolean;
  saved: boolean;
};

type Counted = Video & { likes: { count: number }[]; comments: { count: number }[]; saves: { count: number }[] };

const SELECT = "*, likes(count), comments(count), saves(count)";

export async function hydrateVideos(rows: Counted[], viewerId?: string | null): Promise<VideoWithMeta[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const ids = rows.map((r) => r.id);
  const [profiles, liked, saved] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", userIds),
    viewerId ? supabase.from("likes").select("video_id").eq("user_id", viewerId).in("video_id", ids) : Promise.resolve({ data: [] as { video_id: string }[] }),
    viewerId ? supabase.from("saves").select("video_id").eq("user_id", viewerId).in("video_id", ids) : Promise.resolve({ data: [] as { video_id: string }[] }),
  ]);
  const pmap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const likedSet = new Set((liked.data ?? []).map((l) => l.video_id));
  const savedSet = new Set((saved.data ?? []).map((s) => s.video_id));
  return rows
    .filter((r) => pmap.has(r.user_id))
    .map(({ likes, comments, saves, ...v }) => ({
      ...v,
      profile: pmap.get(v.user_id)!,
      like_count: likes[0]?.count ?? 0,
      comment_count: comments[0]?.count ?? 0,
      save_count: saves[0]?.count ?? 0,
      liked: likedSet.has(v.id),
      saved: savedSet.has(v.id),
    }));
}

export type FeedSpec =
  | { kind: "foryou" }
  | { kind: "following"; viewerId: string }
  | { kind: "user"; userId: string }
  | { kind: "tag"; tag: string }
  | { kind: "liked"; userId: string }
  | { kind: "saved"; userId: string }
  | { kind: "search"; q: string }
  | { kind: "single"; id: string };

export async function fetchFeed(spec: FeedSpec, viewerId?: string | null): Promise<VideoWithMeta[]> {
  let q = supabase.from("videos").select(SELECT).order("created_at", { ascending: false }).limit(50);
  if (spec.kind === "user") q = q.eq("user_id", spec.userId);
  if (spec.kind === "tag") q = q.contains("hashtags", [spec.tag.toLowerCase()]);
  if (spec.kind === "single") q = q.eq("id", spec.id);
  if (spec.kind === "search") q = q.or(`title.ilike.%${spec.q}%,description.ilike.%${spec.q}%`);
  if (spec.kind === "following") {
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", spec.viewerId);
    const ids = (data ?? []).map((f) => f.following_id);
    if (ids.length === 0) return [];
    q = q.in("user_id", ids);
  }
  if (spec.kind === "liked" || spec.kind === "saved") {
    const table = spec.kind === "liked" ? "likes" : "saves";
    const { data } = await supabase.from(table).select("video_id").eq("user_id", spec.userId).order("created_at", { ascending: false }).limit(100);
    const ids = (data ?? []).map((r) => r.video_id);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }
  const { data, error } = await q;
  if (error) throw error;
  return hydrateVideos((data ?? []) as unknown as Counted[], viewerId);
}

export const feedKey = (spec: FeedSpec, viewerId?: string | null) => ["feed", spec, viewerId ?? null] as const;

export async function toggleLike(videoId: string, userId: string, liked: boolean) {
  if (liked) await supabase.from("likes").delete().match({ user_id: userId, video_id: videoId });
  else await supabase.from("likes").insert({ user_id: userId, video_id: videoId });
}
export async function toggleSave(videoId: string, userId: string, saved: boolean) {
  if (saved) await supabase.from("saves").delete().match({ user_id: userId, video_id: videoId });
  else await supabase.from("saves").insert({ user_id: userId, video_id: videoId });
}
export async function deleteVideo(video: Pick<Video, "id" | "storage_path">) {
  const { error } = await supabase.from("videos").delete().eq("id", video.id);
  if (error) throw error;
  await supabase.storage.from("videos").remove([video.storage_path]);
}
