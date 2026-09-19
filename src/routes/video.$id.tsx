import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/video/$id")({
  head: () => ({
    meta: [
      { title: "Video — Gallery" },
      { name: "description", content: "Watch this video on Gallery." },
      { property: "og:title", content: "Video — Gallery" },
      { property: "og:description", content: "Watch this video on Gallery." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  return <Feed spec={{ kind: "single", id }} empty="This video no longer exists." />;
}
