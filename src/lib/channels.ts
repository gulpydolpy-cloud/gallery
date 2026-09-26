import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkAchievements } from "@/lib/achievements";
import type { Attachment } from "@/components/MediaComposer";

const db = supabase as unknown as { from: (table: string) => any };

export type Channel = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  avatar_path: string | null;
  is_active: boolean;
  created_at: string;
};

export async function uploadChannelAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/channel-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export function useChannelDirectory(search: string) {
  return useQuery({
    queryKey: ["channel-directory", search],
    queryFn: async () => {
      let q = db.from("channels").select("*").order("created_at", { ascending: false });
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data } = await q;
      const rows = (data ?? []) as Channel[];
      if (!rows.length) return [];
      const { data: follows } = await db.from("channel_follows").select("channel_id");
      const counts = new Map<string, number>();
      for (const f of (follows ?? []) as { channel_id: string }[]) counts.set(f.channel_id, (counts.get(f.channel_id) ?? 0) + 1);
      return rows.map((c) => ({ ...c, followerCount: counts.get(c.id) ?? 0 }));
    },
  });
}

export async function createChannel(ownerId: string, name: string, description: string, avatarPath: string | null) {
  const { data, error } = await db
    .from("channels")
    .insert({ owner_id: ownerId, name: name.trim(), description: description.trim(), avatar_path: avatarPath })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  void checkAchievements(ownerId);
  return data.id as string;
}

export async function updateChannel(channelId: string, patch: { name?: string; description?: string; avatar_path?: string | null; is_active?: boolean }) {
  const { error } = await db.from("channels").update(patch).eq("id", channelId);
  if (error) throw new Error(error.message);
}

export function useChannel(channelId: string) {
  return useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => (await db.from("channels").select("*").eq("id", channelId).maybeSingle()).data as Channel | null,
  });
}

export function useIsFollowingChannel(channelId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["channel-follow", channelId, userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      Boolean((await db.from("channel_follows").select("channel_id").eq("channel_id", channelId).eq("user_id", userId).maybeSingle()).data),
  });
}

export function useChannelFollowerCount(channelId: string) {
  return useQuery({
    queryKey: ["channel-follower-count", channelId],
    queryFn: async () => (await db.from("channel_follows").select("channel_id", { count: "exact", head: true }).eq("channel_id", channelId)).count ?? 0,
  });
}

export async function followChannel(channelId: string, userId: string) {
  const { error } = await db.from("channel_follows").insert({ channel_id: channelId, user_id: userId });
  if (error) throw new Error(error.message);
}
export async function unfollowChannel(channelId: string, userId: string) {
  await db.from("channel_follows").delete().eq("channel_id", channelId).eq("user_id", userId);
}

/** Channels you own or follow, for the Inbox's separate Channels section. */
export function useMyChannelInbox(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-channel-inbox", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: owned } = await db.from("channels").select("*").eq("owner_id", userId);
      const { data: followedRows } = await db.from("channel_follows").select("channel_id").eq("user_id", userId);
      const followedIds = (followedRows ?? []).map((f: { channel_id: string }) => f.channel_id);
      const { data: followed } = followedIds.length ? await db.from("channels").select("*").in("id", followedIds) : { data: [] };
      const map = new Map<string, Channel>();
      for (const c of (owned ?? []) as Channel[]) map.set(c.id, c);
      for (const c of (followed ?? []) as Channel[]) map.set(c.id, c);
      const ids = Array.from(map.keys());
      const { data: lastPosts } = ids.length
        ? await db.from("channel_posts").select("channel_id, content, created_at").in("channel_id", ids).order("created_at", { ascending: false })
        : { data: [] };
      const lastMap = new Map<string, { content: string | null; created_at: string }>();
      for (const p of (lastPosts ?? []) as { channel_id: string; content: string | null; created_at: string }[]) {
        if (!lastMap.has(p.channel_id)) lastMap.set(p.channel_id, p);
      }
      return Array.from(map.values())
        .map((c) => ({ ...c, isOwner: c.owner_id === userId, last: lastMap.get(c.id) }))
        .sort((a, b) => (b.last?.created_at ?? b.created_at).localeCompare(a.last?.created_at ?? a.created_at));
    },
  });
}

export function useChannelPosts(channelId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["channel-posts", channelId],
    queryFn: async () => (await db.from("channel_posts").select("*").eq("channel_id", channelId).order("created_at")).data ?? [],
  });
  useEffect(() => {
    const ch = supabase
      .channel(`channel-posts-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_posts", filter: `channel_id=eq.${channelId}` }, () =>
        qc.invalidateQueries({ queryKey: ["channel-posts", channelId] })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_post_reactions" }, () =>
        qc.invalidateQueries({ queryKey: ["channel-reactions", channelId] })
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [channelId, qc]);
  return query;
}

export function useChannelReactions(channelId: string) {
  return useQuery({
    queryKey: ["channel-reactions", channelId],
    queryFn: async () => {
      const { data: posts } = await db.from("channel_posts").select("id").eq("channel_id", channelId);
      const ids = (posts ?? []).map((p: { id: string }) => p.id);
      if (!ids.length) return [] as { post_id: string; user_id: string; emoji: string }[];
      return ((await db.from("channel_post_reactions").select("*").in("post_id", ids)).data ?? []) as { post_id: string; user_id: string; emoji: string }[];
    },
  });
}

export async function postToChannel(channelId: string, senderId: string, content: string, attachment: Attachment) {
  const { error } = await db.from("channel_posts").insert({
    channel_id: channelId,
    sender_id: senderId,
    content: content || null,
    image_path: attachment.image_path ?? null,
    sticker_path: attachment.sticker_path ?? null,
    voice_path: attachment.voice_path ?? null,
    voice_duration: attachment.voice_duration ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteChannelPost(postId: string) {
  await db.from("channel_posts").delete().eq("id", postId);
}

export async function toggleReaction(postId: string, userId: string, emoji: string, alreadyReacted: boolean) {
  if (alreadyReacted) {
    await db.from("channel_post_reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji);
  } else {
    await db.from("channel_post_reactions").insert({ post_id: postId, user_id: userId, emoji });
  }
}
