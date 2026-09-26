import { AttachmentView } from "@/components/AttachmentView";
import { StickerImage } from "@/components/StickerPicker";
import { MediaComposer } from "@/components/MediaComposer";
import { GroupManageDialog } from "@/components/GroupManageDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
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
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const { data: convs = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: Boolean(user),
  });
  const conv = convs.find((c) => c.id === id);
  const { data: groupAvatarUrl } = useSignedUrl("media", conv?.avatar_path ?? null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () =>
      (await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at")).data ?? [],
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

  const memberMap = new Map((conv?.all_members || conv?.members || []).map((m) => [m.id, m]));

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden" asChild>
            <Link to="/inbox"><ArrowLeft /></Link>
          </Button>

          {conv?.is_group && (
            groupAvatarUrl ? (
              <img
                src={groupAvatarUrl}
                alt="Group avatar"
                className="size-8 rounded-full object-cover border"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-rose/15 text-rose">
                <Users className="size-4" />
              </span>
            )
          )}

          <div
            className={cn("min-w-0", conv?.is_group && "cursor-pointer hover:opacity-80")}
            onClick={() => conv?.is_group && setGroupSettingsOpen(true)}
          >
            <h2 className="truncate font-bold text-sm leading-tight">
              {conv ? conversationTitle(conv) : "Chat"}
            </h2>
            {conv?.is_group && (
              <p className="truncate text-[11px] text-muted-foreground">
                {(conv.all_members?.length || conv.members.length + 1)} members · Tap for info
              </p>
            )}
          </div>
        </div>

        {conv?.is_group && user && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setGroupSettingsOpen(true)}
            aria-label="Group settings"
          >
            <Settings className="size-4" />
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const sender = memberMap.get(m.sender_id);
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && sender && <UserAvatar profile={sender} size="xs" />}
              <div className={cn("max-w-[75%] space-y-1", mine && "items-end")}>
                {!mine && conv?.is_group && sender && (
                  <p className="px-1 text-[10px] text-muted-foreground">@{sender.username}</p>
                )}
                {m.video_id ? <SharedVideo id={m.video_id} /> : null}
                {m.content?.startsWith("STICKER_PACK:") ? (
                  <SharedStickerPack rawContent={m.content} />
                ) : (
                  m.content && (!m.video_id || m.content !== "Shared a video") && (
                    <p className={cn("rounded-2xl px-3 py-2 text-sm break-words", mine ? "bg-rose text-rose-foreground" : "bg-secondary")}>
                      {m.content}
                    </p>
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

      {conv?.is_group && user && (
        <GroupManageDialog
          conversation={conv}
          currentUserId={user.id}
          isSiteAdmin={isAdmin}
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
        />
      )}
    </div>
  );
}

function SharedVideo({ id }: { id: string }) {
  const { data: video } = useQuery({
    queryKey: ["video-lite", id],
    queryFn: async () =>
      (await supabase.from("videos").select("id, title, storage_path").eq("id", id).maybeSingle()).data as Pick<
        Tables<"videos">,
        "id" | "title" | "storage_path"
      > | null,
  });
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
  const qc = useQueryClient();
  const parts = rawContent.split(":");
  const packId = parts[1] ?? "";
  const packName = parts[2] ?? "Sticker Pack";

  const { data: stickers = [] } = useQuery({
    queryKey: ["stickers-preview", packId],
    queryFn: async () =>
      (await supabase.from("stickers").select("*").eq("pack_id", packId).order("sort").limit(4)).data ?? [],
    enabled: Boolean(packId),
  });

  const savePack = () => {
    try {
      const savedStr = localStorage.getItem("gallery_saved_packs") || "[]";
      const saved: string[] = JSON.parse(savedStr);
      if (!saved.includes(packId)) {
        saved.push(packId);
        localStorage.setItem("gallery_saved_packs", JSON.stringify(saved));
        qc.invalidateQueries({ queryKey: ["sticker-packs"] });
        toast.success(`Saved "${packName}" to your stickers!`);
      } else {
        toast.info("Pack is already saved!");
      }
    } catch {
      toast.error("Could not save pack");
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-2 max-w-[240px]">
      <p className="font-bold text-xs truncate">📦 {packName}</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">
        {stickers.map((s) => (
          <div key={s.id} className="size-12 flex items-center justify-center">
            <StickerImage path={s.storage_path} />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={savePack}>
        Save Pack
      </Button>
    </div>
  );
}
