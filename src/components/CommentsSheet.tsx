import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ProfileLite } from "@/lib/videos";

type Comment = { id: string; user_id: string; parent_id: string | null; content: string; created_at: string; profile: ProfileLite };

async function fetchComments(videoId: string): Promise<Comment[]> {
  const { data } = await supabase.from("comments").select("*").eq("video_id", videoId).order("created_at", { ascending: true });
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", ids) : { data: [] };
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.filter((r) => pmap.has(r.user_id)).map((r) => ({ ...r, profile: pmap.get(r.user_id)! }));
}

export function CommentsSheet({ videoId, open, onOpenChange, onCountChange }: { videoId: string; open: boolean; onOpenChange: (o: boolean) => void; onCountChange?: (n: number) => void }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const { data: comments = [] } = useQuery({ queryKey: ["comments", videoId], queryFn: () => fetchComments(videoId), enabled: open });

  useEffect(() => {
    if (open) onCountChange?.(comments.length);
  }, [comments.length, open, onCountChange]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast("Log in to comment", { action: { label: "Log in", onClick: () => navigate({ to: "/auth" }) } });
      return;
    }
    if (!text.trim()) return;
    const { error } = await supabase.from("comments").insert({ video_id: videoId, user_id: user.id, content: text.trim(), parent_id: replyTo?.id ?? null });
    if (error) return toast.error(error.message);
    setText("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["comments", videoId] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["comments", videoId] });
  };

  const roots = comments.filter((c) => !c.parent_id);
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);

  const Item = ({ c, depth }: { c: Comment; depth: number }) => (
    <div className={depth ? "ml-10" : ""}>
      <div className="flex gap-3 py-2">
        <Link to="/u/$username" params={{ username: c.profile.username }}>
          <UserAvatar profile={c.profile} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">@{c.profile.username}</p>
          <p className="text-sm break-words">{c.content}</p>
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            <span>{new Date(c.created_at).toLocaleDateString()}</span>
            <button onClick={() => setReplyTo(c)} className="font-semibold">Reply</button>
            {user && (user.id === c.user_id || isAdmin) && (
              <button onClick={() => remove(c.id)} className="flex items-center gap-1 text-destructive">
                <Trash2 className="size-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {replies(c.id).map((r) => (
        <Item key={r.id} c={r} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[70vh] flex-col rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-center text-sm">{comments.length} comments</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {roots.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Be the first to comment</p>}
          {roots.map((c) => (
            <Item key={c.id} c={c} depth={0} />
          ))}
        </div>
        <form onSubmit={send} className="border-t p-3">
          {replyTo && (
            <p className="mb-1 flex justify-between text-xs text-muted-foreground">
              Replying to @{replyTo.profile.username}
              <button type="button" onClick={() => setReplyTo(null)}>Cancel</button>
            </p>
          )}
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" maxLength={500} className="rounded-full" />
            <Button type="submit" variant="rose" disabled={!text.trim()}>Post</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
