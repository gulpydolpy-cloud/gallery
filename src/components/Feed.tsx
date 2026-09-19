import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import { useAuth } from "@/lib/auth";
import { feedKey, fetchFeed, type FeedSpec } from "@/lib/videos";

export function Feed({ spec, empty }: { spec: FeedSpec; empty?: React.ReactNode }) {
  const { user } = useAuth();
  const { data: videos, isLoading } = useQuery({ queryKey: feedKey(spec, user?.id), queryFn: () => fetchFeed(spec, user?.id) });
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-index]"));
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: [0.6] },
    );
    items.forEach((i) => obs.observe(i));
    return () => obs.disconnect();
  }, [videos]);

  if (isLoading) return <div className="flex h-[calc(100vh-7rem)] items-center justify-center text-muted-foreground md:h-screen">Loading…</div>;
  if (!videos?.length)
    return <div className="flex h-[calc(100vh-7rem)] items-center justify-center px-6 text-center text-muted-foreground md:h-screen">{empty ?? "No videos yet."}</div>;

  return (
    <div ref={container} className="snap-feed h-[calc(100vh-7rem)] overflow-y-auto md:h-screen">
      {videos.map((v, i) => (
        <div key={v.id} data-index={i} className="snap-item h-full">
          <VideoCard video={v} active={i === active} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        </div>
      ))}
    </div>
  );
}
