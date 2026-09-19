import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Settings } from "lucide-react";
import { useState } from "react";
import { FollowButton } from "@/components/FollowButton";
import { UserAvatar } from "@/components/UserAvatar";
import { VideoGrid } from "@/components/VideoGrid";
import { BanDialog } from "@/components/BanDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openDirectConversation } from "@/lib/chat";
import { fetchFeed } from "@/lib/videos";
import { formatCount } from "@/lib/media";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Gallery` },
      { name: "description", content: `Videos by @${params.username} on Gallery.` },
      { property: "og:title", content: `@${params.username} — Gallery` },
      { property: "og:description", content: `Videos by @${params.username} on Gallery.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ban, setBan] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => (await supabase.from("profiles").select("*").ilike("username", username).maybeSingle()).data,
  });
  const id = profile?.id;
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [followers, following, vids] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id!),
        supabase.from("videos").select("id").eq("user_id", id!),
      ]);
      const vidIds = (vids.data ?? []).map((v) => v.id);
      const likes = vidIds.length ? await supabase.from("likes").select("*", { count: "exact", head: true }).in("video_id", vidIds) : { count: 0 };
      return { followers: followers.count ?? 0, following: following.count ?? 0, likes: likes.count ?? 0 };
    },
  });
  const { data: videos = [] } = useQuery({ queryKey: ["feed", { kind: "user", userId: id }, user?.id], enabled: Boolean(id), queryFn: () => fetchFeed({ kind: "user", userId: id! }, user?.id) });
  const { data: liked = [] } = useQuery({ queryKey: ["feed", { kind: "liked", userId: id }, user?.id], enabled: Boolean(id), queryFn: () => fetchFeed({ kind: "liked", userId: id! }, user?.id) });
  const isMe = user?.id === id;
  const { data: saved = [] } = useQuery({ queryKey: ["feed", { kind: "saved", userId: id }, user?.id], enabled: Boolean(id) && isMe, queryFn: () => fetchFeed({ kind: "saved", userId: id! }, user?.id) });

  if (isLoading) return null;
  if (!profile) return <p className="p-10 text-center text-muted-foreground">Couldn't find @{username}</p>;

  const message = async () => {
    if (!user) return navigate({ to: "/auth" });
    const cid = await openDirectConversation(user.id, profile.id);
    navigate({ to: "/inbox/$id", params: { id: cid } });
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-start sm:text-left">
        <UserAvatar profile={profile} size="xl" />
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-extrabold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
          <div className="flex justify-center gap-6 text-sm sm:justify-start">
            <Stat n={stats?.following ?? 0} label="Following" />
            <Stat n={stats?.followers ?? 0} label="Followers" />
            <Stat n={stats?.likes ?? 0} label="Likes" />
          </div>
          {profile.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {isMe ? (
              <Button variant="outline" asChild><Link to="/settings"><Settings /> Edit profile</Link></Button>
            ) : (
              <>
                <FollowButton targetId={profile.id} />
                <Button variant="outline" onClick={message}><MessageCircle /> Message</Button>
                {isAdmin && <Button variant="destructive" onClick={() => setBan(true)}>Ban user</Button>}
              </>
            )}
          </div>
        </div>
      </div>
      <Tabs defaultValue="videos">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="videos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none">Videos</TabsTrigger>
          <TabsTrigger value="liked" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none">Liked</TabsTrigger>
          {isMe && <TabsTrigger value="saved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none">Saved</TabsTrigger>}
        </TabsList>
        <TabsContent value="videos" className="pt-3"><VideoGrid videos={videos} empty={isMe ? "Upload your first video!" : "No videos yet"} /></TabsContent>
        <TabsContent value="liked" className="pt-3"><VideoGrid videos={liked} empty="No liked videos" /></TabsContent>
        {isMe && <TabsContent value="saved" className="pt-3"><VideoGrid videos={saved} empty="No saved videos" /></TabsContent>}
      </Tabs>
      {isAdmin && <BanDialog user={profile} open={ban} onOpenChange={setBan} />}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <p><span className="font-bold">{formatCount(n)}</span> <span className="text-muted-foreground">{label}</span></p>
  );
}
