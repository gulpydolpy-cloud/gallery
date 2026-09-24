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
    <div className="relative h-[calc(100dvh-7rem)] min-h-[560px] w-full bg-video-bg md:h-screen md:min-h-0">
      <LiveRoomView sessionId={id} active onClose={() => navigate({ to: "/live" })} />
    </div>
  );
}
