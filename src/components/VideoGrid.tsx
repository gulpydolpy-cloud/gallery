import { Link } from "@tanstack/react-router";
import { Heart, Play } from "lucide-react";
import { formatCount, useSignedUrl } from "@/lib/media";
import type { VideoWithMeta } from "@/lib/videos";

export function VideoGrid({ videos, empty }: { videos: VideoWithMeta[]; empty?: string }) {
  if (videos.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">{empty ?? "No videos yet"}</p>;
  return (
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">
      {videos.map((v) => (
        <Tile key={v.id} video={v} />
      ))}
    </div>
  );
}

function Tile({ video }: { video: VideoWithMeta }) {
  const { data: src } = useSignedUrl("videos", video.storage_path);
  return (
    <Link to="/video/$id" params={{ id: video.id }} className="group relative aspect-[3/4] overflow-hidden rounded-md bg-video-bg">
      {src && <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
      <div className="video-gradient absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2 text-xs font-semibold text-on-video">
        <span className="flex items-center gap-1"><Play className="size-3 fill-on-video" />{formatCount(video.views)}</span>
        <span className="flex items-center gap-1"><Heart className="size-3" />{formatCount(video.like_count)}</span>
      </div>
      {video.title && <p className="absolute top-2 left-2 right-2 line-clamp-2 text-xs font-semibold text-on-video text-shadow-video">{video.title}</p>}
    </Link>
  );
}
