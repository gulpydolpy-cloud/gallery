import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type StickerPack = { id: string; name: string; is_official: boolean; stickers: { id: string; storage_path: string }[] };

export async function fetchStickerPacks(): Promise<StickerPack[]> {
  const [{ data: packs }, { data: stickers }] = await Promise.all([
    supabase.from("sticker_packs").select("id, name, is_official").order("is_official", { ascending: false }).order("created_at"),
    supabase.from("stickers").select("id, pack_id, storage_path").order("sort"),
  ]);
  return (packs ?? []).map((p) => ({ ...p, stickers: (stickers ?? []).filter((s) => s.pack_id === p.id) }));
}

export function StickerImage({ path, className }: { path: string; className?: string }) {
  const { data: src } = useSignedUrl("media", path);
  if (!src) return <div className={cn("aspect-square w-full animate-pulse rounded-lg bg-muted", className)} />;
  return <img src={src} alt="Sticker" className={cn("w-full object-contain", className)} draggable={false} />;
}

export function StickerPicker({ onPick }: { onPick: (path: string) => void }) {
  const { data: packs = [] } = useQuery({ queryKey: ["sticker-packs"], queryFn: fetchStickerPacks, staleTime: 5 * 60 * 1000 });
  const [active, setActive] = useState(0);
  const pack = packs[active];

  if (!packs.length) return <p className="p-4 text-center text-sm text-muted-foreground">No sticker packs yet.</p>;

  return (
    <div className="w-[17rem] space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {packs.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(i)}
            className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", i === active ? "bg-rose text-rose-foreground" : "bg-secondary")}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
        {pack?.stickers.map((s) => (
          <button key={s.id} onClick={() => onPick(s.storage_path)} className="rounded-xl p-1 transition-transform hover:bg-accent active:scale-90">
            <StickerImage path={s.storage_path} />
          </button>
        ))}
        {pack && pack.stickers.length === 0 && <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">This pack is empty.</p>}
      </div>
    </div>
  );
}
