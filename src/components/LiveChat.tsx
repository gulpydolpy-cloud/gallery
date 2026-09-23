import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";
import { useLiveChat, sendLiveChat, deleteLiveChatMessage } from "@/lib/live";

export function LiveChat({ sessionId, canModerate }: { sessionId: string; canModerate: boolean }) {
  const { user } = useAuth();
  const { data: messages = [] } = useLiveChat(sessionId);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const value = text.trim();
    setText("");
    try {
      await sendLiveChat(sessionId, value);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {messages.map((m) => (
          <div key={m.id} className="group flex items-start gap-2 text-sm">
            {m.profile && <UserAvatar profile={m.profile} size="xs" />}
            <p className="min-w-0 flex-1 rounded-lg bg-black/30 px-2 py-1 text-white">
              <span className="font-semibold">{m.profile?.username ?? "user"}: </span>
              {m.content}
            </p>
            {(canModerate || m.user_id === user?.id) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteLiveChatMessage(m.id).catch((err) => toast.error((err as Error).message))}
                className="size-7 shrink-0 text-on-video opacity-0 transition-opacity hover:bg-on-video/10 group-hover:opacity-100"
                aria-label="Delete message"
              >
                <Trash2 className="size-3.5 opacity-70" />
              </Button>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {user && (
        <form onSubmit={send} className="flex gap-2 px-3 pb-3 pt-1">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something…" className="h-10 rounded-full border-on-video/20 bg-video-bg/55 px-4 text-on-video placeholder:text-on-video/55" />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" variant="rose">
            <Send className="size-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
