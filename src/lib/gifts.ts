import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type GiftType = {
  id: string;
  name: string;
  g_dollar_value: number;
  cooldown_seconds: number;
  min_follower_count: number;
  max_per_live: number | null;
  icon_url: string | null;
  animation_key: string;
  is_active: boolean;
};

export function resolveGiftIconUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("gift-assets").getPublicUrl(path).data.publicUrl;
}

export function useGiftTypes() {
  return useQuery({
    queryKey: ["gift-types"],
    queryFn: async () => {
      const { data, error } = await db.from("gift_types").select("*").eq("is_active", true).order("g_dollar_value", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as GiftType[]).map((g) => ({ ...g, icon_url: resolveGiftIconUrl(g.icon_url) }));
    },
  });
}

/** Sends a gift inside a live — G$ is split across everyone currently on screen (host + guests). */
export async function sendLiveGift(sessionId: string, giftTypeId: string) {
  const { data, error } = await db.rpc("send_live_gift", { _session_id: sessionId, _gift_type_id: giftTypeId });
  if (error) throw new Error((error as Error).message ?? "Could not send gift");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No response from server");
  return row as { animation_key: string; recipient_count: number };
}

export async function sendGift(giftTypeId: string, recipientId: string, liveSessionId?: string | null) {
  const { data, error } = await db.rpc("send_gift", {
    _gift_type_id: giftTypeId,
    _recipient_id: recipientId,
    _live_session_id: liveSessionId ?? null,
  });
  if (error) throw new Error((error as Error).message ?? "Could not send gift");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No response from server");
  return row as { new_balance: number; animation_key: string };
}
