import { supabase } from "@/integrations/supabase/client";
import type { ProfileLite } from "@/lib/videos";

export type ConversationSummary = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  members: ProfileLite[];
  last?: { content: string; created_at: string; video_id: string | null } | null;
};

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false });
  if (!convs?.length) return [];
  const ids = convs.map((c) => c.id);
  const { data: members } = await supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids);
  const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", userIds) : { data: [] };
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const { data: lasts } = await supabase.from("messages").select("conversation_id, content, created_at, video_id").in("conversation_id", ids).order("created_at", { ascending: false }).limit(200);
  const lastMap = new Map<string, NonNullable<ConversationSummary["last"]>>();
  for (const m of lasts ?? []) if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
  return convs
    .map((c) => ({
      ...c,
      members: (members ?? []).filter((m) => m.conversation_id === c.id && m.user_id !== userId).map((m) => pmap.get(m.user_id)).filter(Boolean) as ProfileLite[],
      last: lastMap.get(c.id) ?? null,
    }))
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
}

export function conversationTitle(c: ConversationSummary) {
  if (c.name) return c.name;
  if (c.members.length === 0) return "Just you";
  return c.members.map((m) => m.display_name || m.username).join(", ");
}

/** Find an existing 1:1 conversation or create one. */
export async function openDirectConversation(me: string, other: string): Promise<string> {
  const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", me);
  const ids = (mine ?? []).map((m) => m.conversation_id);
  if (ids.length) {
    const { data: convs } = await supabase.from("conversations").select("id").in("id", ids).eq("is_group", false);
    for (const c of convs ?? []) {
      const { data: mem } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", c.id);
      const set = new Set((mem ?? []).map((m) => m.user_id));
      if (set.size === 2 && set.has(other)) return c.id;
    }
  }
  return createConversation(me, [other], null, false);
}

export async function createConversation(me: string, others: string[], name: string | null, isGroup: boolean): Promise<string> {
  const { data: conv, error } = await supabase.from("conversations").insert({ created_by: me, name, is_group: isGroup }).select("id").single();
  if (error) throw error;
  const rows = Array.from(new Set([me, ...others])).map((user_id) => ({ conversation_id: conv.id, user_id }));
  const { error: mErr } = await supabase.from("conversation_members").insert(rows);
  if (mErr) throw mErr;
  return conv.id;
}

export async function sendMessage(conversationId: string, sender: string, content: string, videoId?: string | null) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: sender, content, video_id: videoId ?? null });
  if (error) throw error;
}
