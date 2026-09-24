import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LiveRoomView } from "@/components/LiveRoomView";

export const Route = createFileRoute("/live/$id")({
  head: () => ({
    meta: [
      { title: "Live broadcast — Gallery" },
      { name: "description", content: "Watch and join a live creator broadcast on Gallery." },
      { property: "og:title", content: "Live broadcast — Gallery" },
      { property: "og:description", content: "Watch and join a live creator broadcast on Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveRoomPage,
});

function LiveRoomPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-40 bg-video-bg">
      <LiveRoomView sessionId={id} active onClose={() => navigate({ to: "/live" })} />
    </div>
  );
}
