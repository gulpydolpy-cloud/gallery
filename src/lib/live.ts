import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type LiveSession = { id: string; host_id: string; title: string; status: "live" | "ended"; started_at: string; ended_at: string | null };
export type LiveParticipant = { id: string; session_id: string; user_id: string; role: "host" | "guest"; slot: number; joined_at: string; left_at: string | null };
export type LiveChatMessage = { id: string; session_id: string; user_id: string; content: string; created_at: string };

export function useLiveSessions() {
  return useQuery({
    queryKey: ["live-sessions"],
    queryFn: async () => {
      const { data, error } = await db.from("live_sessions").select("*").eq("status", "live").order("started_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as LiveSession[];
      if (!rows.length) return [];
      const hostIds = rows.map((r) => r.host_id);
      const { data: hosts } = await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", hostIds);
      const { data: counts } = await db.from("live_participants").select("session_id").in("session_id", rows.map((r) => r.id)).is("left_at", null);
      const hostMap = new Map((hosts ?? []).map((h) => [h.id, h]));
      const countMap = new Map<string, number>();
      for (const row of (counts ?? []) as { session_id: string }[]) countMap.set(row.session_id, (countMap.get(row.session_id) ?? 0) + 1);
      return rows.map((r) => ({ ...r, host: hostMap.get(r.host_id), participantCount: countMap.get(r.id) ?? 1 }));
    },
    refetchInterval: 10000,
  });
}

export async function startLive(title: string): Promise<string> {
  const { data, error } = await db.rpc("start_live", { _title: title });
  if (error) throw new Error((error as Error).message ?? "Could not start live");
  return data as string;
}

export function useLiveSession(sessionId: string) {
  return useQuery({
    queryKey: ["live-session", sessionId],
    queryFn: async () => (await db.from("live_sessions").select("*").eq("id", sessionId).maybeSingle()).data as LiveSession | null,
    refetchInterval: 5000,
  });
}

export function useLiveParticipants(sessionId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["live-participants", sessionId],
    queryFn: async () => {
      const { data } = await db.from("live_participants").select("*").eq("session_id", sessionId).is("left_at", null).order("slot");
      const rows = (data ?? []) as LiveParticipant[];
      if (!rows.length) return [];
      const ids = rows.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`live-participants-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_participants", filter: `session_id=eq.${sessionId}` }, () => {
        qc.invalidateQueries({ queryKey: ["live-participants", sessionId] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [sessionId, qc]);

  return query;
}

export async function joinLive(sessionId: string): Promise<number> {
  const { data, error } = await db.rpc("join_live", { _session_id: sessionId });
  if (error) throw new Error((error as Error).message ?? "Could not join");
  return data as number;
}
export async function leaveLive(sessionId: string) {
  const { error } = await db.rpc("leave_live", { _session_id: sessionId });
  if (error) throw new Error((error as Error).message);
}
export async function kickParticipant(sessionId: string, targetUserId: string) {
  const { error } = await db.rpc("kick_participant", { _session_id: sessionId, _target: targetUserId });
  if (error) throw new Error((error as Error).message);
}
export async function endLive(sessionId: string) {
  const { error } = await db.rpc("end_live", { _session_id: sessionId });
  if (error) throw new Error((error as Error).message);
}

export function useLiveChat(sessionId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["live-chat", sessionId],
    queryFn: async () => {
      const { data } = await db.from("live_chat_messages").select("*").eq("session_id", sessionId).order("created_at").limit(200);
      const rows = (data ?? []) as LiveChatMessage[];
      if (!rows.length) return [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`live-chat-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_messages", filter: `session_id=eq.${sessionId}` }, () => {
        qc.invalidateQueries({ queryKey: ["live-chat", sessionId] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [sessionId, qc]);

  return query;
}

export async function sendLiveChat(sessionId: string, content: string) {
  const { error } = await db.rpc("send_live_chat", { _session_id: sessionId, _content: content });
  if (error) throw new Error((error as Error).message);
}
export async function deleteLiveChatMessage(messageId: string) {
  const { error } = await db.rpc("delete_live_chat_message", { _message_id: messageId });
  if (error) throw new Error((error as Error).message);
}
