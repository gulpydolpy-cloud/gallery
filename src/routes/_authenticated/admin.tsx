import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BanDialog } from "@/components/BanDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { deleteVideo, fetchFeed } from "@/lib/videos";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Gallery" },
      { name: "description", content: "Moderate Gallery: review reports, remove videos and manage bans." },
      { property: "og:title", content: "Admin — Gallery" },
      { property: "og:description", content: "Moderate Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [banTarget, setBanTarget] = useState<{ id: string; username: string } | null>(null);

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false });
      const rows = data ?? [];
      const vids = Array.from(new Set(rows.map((r) => r.video_id)));
      const { data: videos } = vids.length ? await supabase.from("videos").select("id, title, user_id, storage_path").in("id", vids) : { data: [] };
      const vmap = new Map((videos ?? []).map((v) => [v.id, v]));
      return rows.map((r) => ({ ...r, video: vmap.get(r.video_id) ?? null }));
    },
  });
  const { data: bans = [] } = useQuery({
    queryKey: ["admin-bans"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("bans").select("*").order("created_at", { ascending: false });
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((b) => b.user_id)));
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", ids) : { data: [] };
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((b) => ({ ...b, profile: pmap.get(b.user_id) ?? null }));
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users", q],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_path, created_at").ilike("username", `%${q.trim()}%`).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: videos = [] } = useQuery({ queryKey: ["admin-videos", q], enabled: isAdmin, queryFn: () => fetchFeed(q.trim() ? { kind: "search", q: q.trim() } : { kind: "foryou" }, user?.id) });

  if (loading) return null;
  if (!isAdmin) return <p className="p-10 text-center text-muted-foreground">You don't have access to this page.</p>;

  const removeVideo = async (v: { id: string; storage_path: string }) => {
    if (!confirm("Delete this video for everyone?")) return;
    try {
      await deleteVideo(v);
      toast.success("Video deleted");
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };
  const unban = async (id: string) => {
    await supabase.from("bans").delete().eq("id", id);
    toast.success("Ban lifted");
    qc.invalidateQueries({ queryKey: ["admin-bans"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users or videos" className="max-w-md" />
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="bans">Bans ({bans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-2 pt-3">
          {reports.length === 0 && <p className="text-sm text-muted-foreground">No open reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.reason}</p>
                {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
                <p className="text-xs text-muted-foreground">
                  {r.video ? <Link to="/video/$id" params={{ id: r.video.id }} className="underline">{r.video.title || "Untitled video"}</Link> : "Video removed"} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              {r.video && <Button variant="destructive" size="sm" onClick={() => removeVideo(r.video!)}><Trash2 /> Delete video</Button>}
              <Button variant="outline" size="sm" onClick={() => resolve(r.id)}>Dismiss</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="users" className="space-y-1 pt-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <UserAvatar profile={u} size="sm" />
              <Link to="/u/$username" params={{ username: u.username }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.display_name || u.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </Link>
              {u.id !== user?.id && <Button variant="destructive" size="sm" onClick={() => setBanTarget(u)}>Ban</Button>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="videos" className="space-y-1 pt-3">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <Link to="/video/$id" params={{ id: v.id }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{v.title || "Untitled"}</p>
                <p className="truncate text-xs text-muted-foreground">@{v.profile.username} · {v.like_count} likes · {v.views} views</p>
              </Link>
              <Button variant="destructive" size="sm" onClick={() => removeVideo(v)}><Trash2 /> Delete</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="bans" className="space-y-1 pt-3">
          {bans.length === 0 && <p className="text-sm text-muted-foreground">Nobody is banned.</p>}
          {bans.map((b) => {
            const active = !b.expires_at || new Date(b.expires_at) > new Date();
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                {b.profile && <UserAvatar profile={b.profile} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">@{b.profile?.username ?? "unknown"} {!active && <span className="text-xs text-muted-foreground">(expired)</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.reason || "No reason"} · {b.expires_at ? `until ${new Date(b.expires_at).toLocaleString()}` : "permanent"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => unban(b.id)}>{active ? "Unban" : "Remove"}</Button>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
      {banTarget && <BanDialog user={banTarget} open onOpenChange={(o) => !o && setBanTarget(null)} />}
    </div>
  );
}
