import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GiftType = Omit<Tables<"gift_types">, "icon_url"> & { icon_url: string | null };

export function resolveGiftIconUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("gift-assets").getPublicUrl(path).data.publicUrl;
}

export function useGiftTypes() {
  return useQuery({
    queryKey: ["gift-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_types")
        .select("*")
        .eq("is_active", true)
        .order("g_dollar_value", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((g) => ({ ...g, icon_url: resolveGiftIconUrl(g.icon_url) })) as GiftType[];
    },
  });
}

export async function sendGift(giftTypeId: string, recipientId: string) {
  const { data, error } = await supabase.rpc("send_gift", {
    _gift_type_id: giftTypeId,
    _recipient_id: recipientId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No response from server");
  return row as { new_balance: number; animation_key: string };
}
