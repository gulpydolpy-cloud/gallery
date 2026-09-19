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
                {m.content && (!m.video_id || m.content !== "Shared a video") && (
                  <p className={cn("rounded-2xl px-3 py-2 text-sm break-words", mine ? "bg-rose text-rose-foreground" : "bg-secondary")}>{m.content}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="rounded-full" maxLength={2000} />
        <Button type="submit" variant="rose" size="icon" disabled={!text.trim()} aria-label="Send"><Send /></Button>
      </form>
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
