import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { VideoGrid } from "@/components/VideoGrid";
import { useAuth } from "@/lib/auth";
import { fetchFeed } from "@/lib/videos";

export const Route = createFileRoute("/tag/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} — Gallery` },
      { name: "description", content: `Videos tagged #${params.tag} on Gallery.` },
      { property: "og:title", content: `#${params.tag} — Gallery` },
      { property: "og:description", content: `Videos tagged #${params.tag} on Gallery.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const { user } = useAuth();
  const { data: videos = [] } = useQuery({ queryKey: ["tag", tag, user?.id], queryFn: () => fetchFeed({ kind: "tag", tag }, user?.id) });
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-2xl font-extrabold">#{tag}</h1>
      <p className="text-sm text-muted-foreground">{videos.length} videos</p>
      <VideoGrid videos={videos} />
    </div>
  );
}
