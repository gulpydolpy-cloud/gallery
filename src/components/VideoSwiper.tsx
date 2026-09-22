import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import type { VideoWithMeta } from "@/lib/videos";

/** Full-screen vertical feed opened from a grid, scoped to the videos passed in. */
export function VideoSwiper({ videos, startIndex, onClose }: { videos: VideoWithMeta[]; startIndex: number; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(startIndex);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-index]"));
    items[startIndex]?.scrollIntoView();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset['index']));
      },
      { root, threshold: [0.6] },
    );
    items.forEach((i) => obs.observe(i));
    return () => obs.disconnect();
  }, [startIndex, videos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Button variant="video" size="icon" onClick={onClose} aria-label="Back" className="absolute top-3 left-3 z-[60] bg-video-bg/60">
        <X />
      </Button>
      <div ref={container} className="snap-feed h-full overflow-y-auto">
        {videos.map((v, i) => (
          <div key={v.id} data-index={i} className="snap-item h-full">
            <VideoCard video={v} active={i === active} />
          </div>
        ))}
      </div>
    </div>
  );
}
