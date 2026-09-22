import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { CreateStickerPackDialog } from "@/components/CreateStickerPackDialog";

export type StickerPack = {
  id: string;
  name: string;
  creator_id?: string | null;
  is_official: boolean;
  stickers: { id: string; storage_path: string }[];
};

export async function fetchStickerPacks(): Promise<StickerPack[]> {
  const [{ data: packs }, { data: stickers }] = await Promise.all([
    supabase
      .from("sticker_packs")
      .select("id, name, creator_id, is_official")
      .order("is_official", { ascending: false })
      .order("created_at"),
    supabase.from("stickers").select("id, pack_id, storage_path").order("sort"),
  ]);
  return (packs ?? []).map((p) => ({ ...p, stickers: (stickers ?? []).filter((s) => s.pack_id === p.id) }));
}

export function StickerImage({ path, className }: { path: string; className?: string }) {
  const { data: src } = useSignedUrl("media", path);
  if (!src) return <div className={cn("aspect-square w-full animate-pulse rounded-lg bg-muted", className)} />;
  return <img src={src} alt="Sticker" className={cn("w-full object-contain", className)} draggable={false} />;
}

export function StickerPicker({
  userId,
  onPick,
  onSharePack,
}: {
  userId?: string | undefined;
  onPick: (path: string) => void;
  onSharePack?: ((packId: string, packName: string) => void) | undefined;
}) {
  const { data: allPacks = [] } = useQuery({
    queryKey: ["sticker-packs"],
    queryFn: fetchStickerPacks,
    staleTime: 5 * 60 * 1000,
  });

  // Read saved packs from local storage
  const savedPackIds: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("gallery_saved_packs") || "[]");
    } catch {
      return [];
    }
  })();

  // Filter packs: official + created by me + packs I saved from chat
  const packs = allPacks.filter(
    (p) => p.is_official || (userId && p.creator_id === userId) || savedPackIds.includes(p.id)
  );

  const [active, setActive] = useState(0);
  const pack = packs[active] || packs[0];

  return (
    <div className="w-[18rem] space-y-2">
      {/* Pack Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {packs.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              (packs[active]?.id === p.id) ? "bg-rose text-rose-foreground" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {p.name}
          </button>
        ))}
        {userId && <CreateStickerPackDialog userId={userId} />}
      </div>

      {/* Active Pack Action Header */}
      {pack && onSharePack && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground border-b pb-1">
          <span className="font-medium truncate max-w-[12rem]">{pack.name} ({pack.stickers.length})</span>
          <button
            type="button"
            onClick={() => onSharePack(pack.id, pack.name)}
            className="flex items-center gap-1 font-semibold text-rose hover:underline"
          >
            <Share2 className="size-3" />
            <span>Send pack</span>
          </button>
        </div>
      )}

      {/* Stickers Grid */}
      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
        {pack?.stickers.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.storage_path)}
            className="rounded-xl p-1 transition-transform hover:bg-accent active:scale-90"
          >
            <StickerImage path={s.storage_path} />
          </button>
        ))}
        {pack && pack.stickers.length === 0 && (
          <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">This pack has no stickers yet.</p>
        )}
      </div>
    </div>
  );
}
