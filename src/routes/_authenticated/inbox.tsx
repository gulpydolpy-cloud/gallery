import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Radio, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { conversationTitle, createConversation, fetchConversations } from "@/lib/chat";
import { useMyChannelInbox } from "@/lib/channels";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Gallery" },
      { name: "description", content: "Your messages and group chats on Gallery." },
      { property: "og:title", content: "Inbox — Gallery" },
      { property: "og:description", content: "Your messages and group chats on Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxLayout,
});

function InboxLayout() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inChat = pathname !== "/inbox" && pathname !== "/inbox/";
  const [newChat, setNewChat] = useState(false);
  const { data: convs = [] } = useQuery({ queryKey: ["conversations", user?.id], queryFn: () => fetchConversations(user!.id), enabled: Boolean(user), refetchInterval: 15000 });

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-screen">
      <aside className={cn("w-full shrink-0 flex-col border-r md:flex md:w-80", inChat ? "hidden" : "flex")}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-extrabold">Inbox</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild>
              <Link to="/channels"><Radio className="size-4" /> Channels</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setNewChat(true)} aria-label="New chat"><Plus /></Button>
          </div>
        </div>
        <MyChannelsStrip userId={user?.id} />
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No chats yet. Start one with the + button or from someone's profile.</p>}
          {convs.map((c) => (
            <Link
              key={c.id}
              to="/inbox/$id"
              params={{ id: c.id }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
              activeProps={{ className: "flex items-center gap-3 px-4 py-3 bg-accent" }}
            >
              {c.is_group ? (
                <span className="flex size-12 items-center justify-center rounded-full bg-rose/15 text-rose"><Users /></span>
              ) : c.members[0] ? (
                <UserAvatar profile={c.members[0]} />
              ) : (
                <span className="size-12 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{conversationTitle(c)}</p>
                <p className="truncate text-sm text-muted-foreground">{c.last ? (c.last.video_id ? "🎬 Shared a video" : c.last.content) : "Say hi"}</p>
              </div>
            </Link>
          ))}
        </div>
      </aside>
      <section className={cn("min-w-0 flex-1 flex-col md:flex", inChat ? "flex" : "hidden")}>
        {inChat ? <Outlet /> : <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a chat</div>}
      </section>
      <NewChatDialog open={newChat} onOpenChange={setNewChat} />
    </div>
  );
}

function NewChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Map<string, { id: string; username: string; display_name: string | null; avatar_path: string | null }>>(new Map());
  const { data: people = [] } = useQuery({
    queryKey: ["people-search", q],
    enabled: open && q.trim().length > 0,
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_path").ilike("username", `%${q.trim()}%`).neq("id", user!.id).limit(10)).data ?? [],
  });

  const toggle = (p: (typeof people)[number]) => {
    const m = new Map(selected);
    if (m.has(p.id)) m.delete(p.id);
    else m.set(p.id, p);
    setSelected(m);
  };

  const create = async () => {
    if (!user || selected.size === 0) return;
    const ids = Array.from(selected.keys());
    const isGroup = ids.length > 1 || name.trim().length > 0;
    try {
      const id = await createConversation(user.id, ids, isGroup ? name.trim() || null : null, isGroup);
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      onOpenChange(false);
      setSelected(new Map());
      setName("");
      navigate({ to: "/inbox/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New chat</DialogTitle></DialogHeader>
        <Input placeholder="Group name (optional, for group chats)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Search people by username" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.size > 0 && (
          <p className="flex flex-wrap gap-1 text-xs">
            {Array.from(selected.values()).map((p) => <span key={p.id} className="rounded-full bg-secondary px-2 py-0.5 font-semibold">@{p.username}</span>)}
          </p>
        )}
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {people.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p)} />
              <UserAvatar profile={p} size="sm" />
              <span className="text-sm font-semibold">@{p.username}</span>
            </label>
          ))}
        </div>
        <Button variant="rose" disabled={selected.size === 0} onClick={create}>
          {selected.size > 1 || name.trim() ? "Create group chat" : "Start chat"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
