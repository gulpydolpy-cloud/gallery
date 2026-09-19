import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { VideoGrid } from "@/components/VideoGrid";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchFeed } from "@/lib/videos";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Gallery" },
      { name: "description", content: "Search videos, people and hashtags on Gallery." },
      { property: "og:title", content: "Explore — Gallery" },
      { property: "og:description", content: "Search videos, people and hashtags on Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const term = q.trim();
  const { data: videos = [] } = useQuery({ queryKey: ["explore", term, user?.id], queryFn: () => fetchFeed(term ? { kind: "search", q: term } : { kind: "foryou" }, user?.id) });
  const { data: people = [] } = useQuery({
    queryKey: ["explore-people", term],
    enabled: term.length > 0,
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_path").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(12)).data ?? [],
  });
  const tags = Array.from(new Set(videos.flatMap((v) => v.hashtags))).slice(0, 20);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="relative">
        <Search className="absolute top-3 left-3 size-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos, people, #hashtags" className="h-11 rounded-full pl-10 text-base" />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link key={t} to="/tag/$tag" params={{ tag: t }} className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold hover:bg-accent">#{t}</Link>
          ))}
        </div>
      )}
      {people.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">People</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {people.map((p) => (
              <Link key={p.id} to="/u/$username" params={{ username: p.username }} className="flex w-24 shrink-0 flex-col items-center gap-1 text-center">
                <UserAvatar profile={p} size="lg" />
                <span className="w-full truncate text-xs font-semibold">@{p.username}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">{term ? "Videos" : "Trending"}</h2>
        <VideoGrid videos={videos} empty={term ? "No videos match your search" : "No videos yet"} />
      </section>
    </div>
  );
}
