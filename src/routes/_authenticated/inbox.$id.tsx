import { AttachmentView } from "@/components/AttachmentView";
import { StickerImage } from "@/components/StickerPicker";
import { MediaComposer } from "@/components/MediaComposer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { conversationTitle, fetchConversations, sendMessage } from "@/lib/chat";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/inbox/$id")({
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const { data: convs = [] } = useQuery({ queryKey: ["conversations", user?.id], queryFn: () => fetchConversations(user!.id), enabled: Boolean(user) });
  const conv = convs.find((c) => c.id === id);
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => (await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at")).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const memberMap = new Map(conv?.members.map((m) => [m.id, m]) ?? []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    try {
      await sendMessage(id, user.id, text.trim());
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" className="md:hidden" asChild><Link to="/inbox"><ArrowLeft /></Link></Button>
        <h2 className="truncate font-bold">{conv ? conversationTitle(conv) : "Chat"}</h2>
        {conv?.is_group && <span className="text-xs text-muted-foreground">· {conv.members.length + 1} members</span>}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const sender = memberMap.get(m.sender_id);
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && sender && <UserAvatar profile={sender} size="xs" />}
              <div className={cn("max-w-[75%] space-y-1", mine && "items-end")}>
                {!mine && conv?.is_group && sender && <p className="px-1 text-[10px] text-muted-foreground">@{sender.username}</p>}
    {m.video_id ? <SharedVideo id={m.video_id} /> : null}
{m.content?.startsWith("STICKER_PACK:") ? (
  <SharedStickerPack rawContent={m.content} />
) : (
  m.content && (!m.video_id || m.content !== "Shared a video") && (
    <p className={cn("rounded-2xl px-3 py-2 text-sm break-words", mine ? "bg-rose text-rose-foreground" : "bg-secondary")}>{m.content}</p>
  )
)}
                
                <AttachmentView
                  image_path={m.image_path}
                  sticker_path={m.sticker_path}
                  voice_path={m.voice_path}
                  voice_duration={m.voice_duration}
                  mine={mine}
                />
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="border-t p-3">
        {user && (
                 <MediaComposer
            userId={user.id}
            placeholder="Message…"
            onSend={async (content, attachment) => {
              await sendMessage(id, user.id, content, attachment);
              qc.invalidateQueries({ queryKey: ["messages", id] });
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }}
            onSharePack={async (packId, packName) => {
              await sendMessage(id, user.id, `STICKER_PACK:${packId}:${packName}`);
              qc.invalidateQueries({ queryKey: ["messages", id] });
              qc.invalidateQueries({ queryKey: ["conversations"] });
              toast.success(`Sent "${packName}" to chat!`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SharedVideo({ id }: { id: string }) {
  const { data: video } = useQuery({ queryKey: ["video-lite", id], queryFn: async () => (await supabase.from("videos").select("id, title, storage_path").eq("id", id).maybeSingle()).data as Pick<Tables<"videos">, "id" | "title" | "storage_path"> | null });
  const { data: src } = useSignedUrl("videos", video?.storage_path);
  if (!video) return <p className="rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">Video unavailable</p>;
  return (
    <Link to="/video/$id" params={{ id }} className="block w-40 overflow-hidden rounded-xl bg-video-bg">
      {src && <video src={src} muted playsInline preload="metadata" className="aspect-[9/16] w-full object-cover" />}
      <p className="truncate bg-secondary px-2 py-1 text-xs font-semibold">{video.title || "Shared video"}</p>
    </Link>
  );
}

function SharedStickerPack({ rawContent }: { rawContent: string }) {
  
  const [, packId, packName] = rawContent.split(":");
  const qc = useQueryClient();
  const [saved, setSaved] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem("gallery_saved_packs") || "[]");
      return list.includes(packId);
    } catch {
      return false;
    }
  });

  const { data: pack } = useQuery({
    queryKey: ["sticker-pack-preview", packId],
    queryFn: async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("sticker_packs").select("id, name").eq("id", packId).maybeSingle(),
        supabase.from("stickers").select("id, storage_path").eq("pack_id", packId).order("sort").limit(4),
      ]);
      return { ...p, stickers: s ?? [] };
    },
  });

  const handleSave = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("gallery_saved_packs") || "[]");
      if (!list.includes(packId)) {
        list.push(packId);
        localStorage.setItem("gallery_saved_packs", JSON.stringify(list));
      }
      setSaved(true);
      toast.success(`Pack "${packName || "Stickers"}" added to your stickers!`);
      qc.invalidateQueries({ queryKey: ["sticker-packs"] });
    } catch {
      toast.error("Could not save pack");
    }
  };

  return (
    <div className="w-56 space-y-2 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="truncate font-bold text-xs">{packName || pack?.name || "Sticker Pack"}</p>
        <span className="text-[10px] text-muted-foreground">{pack?.stickers.length ?? 0} stickers</span>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-secondary/40 p-1">
        {pack?.stickers.map((stk) => (
          <div key={stk.id} className="aspect-square">
            <StickerImage path={stk.storage_path} className="size-full" />
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant={saved ? "secondary" : "rose"}
        className="w-full text-xs font-semibold"
        onClick={handleSave}
        disabled={saved}
      >
        {saved ? "Saved ✓" : "Save Pack"}
      </Button>
    </div>
  );
}

