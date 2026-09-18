import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, MessageCircle, Play, Send, Volume2, VolumeX, MoreHorizontal, Flag, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareDialog } from "@/components/ShareDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/lib/auth";
import { formatCount, useSignedUrl } from "@/lib/media";
import { deleteVideo, toggleLike, toggleSave, type VideoWithMeta } from "@/lib/videos";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = { video: VideoWithMeta; active: boolean; muted: boolean; onToggleMute: () => void };

export function VideoCard({ video, active, muted, onToggleMute }: Props) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: src } = useSignedUrl("videos", video.storage_path);
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(video.liked);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [saved, setSaved] = useState(video.saved);
  const [saveCount, setSaveCount] = useState(video.save_count);
  const [commentCount, setCommentCount] = useState(video.comment_count);
  const [pop, setPop] = useState(false);
  const [comments, setComments] = useState(false);
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (!viewed.current && user) {
        viewed.current = true;
        void supabase.rpc("increment_views", { _video_id: video.id });
      }
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [active, src, user, video.id]);

  const requireAuth = () => {
    if (!user) {
      toast("Log in to do that", { action: { label: "Log in", onClick: () => navigate({ to: "/auth" }) } });
      return false;
    }
    return true;
  };

  const onLike = async () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setPop(true);
    setTimeout(() => setPop(false), 400);
    await toggleLike(video.id, user!.id, liked);
  };
  const onSave = async () => {
    if (!requireAuth()) return;
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => c + (next ? 1 : -1));
    await toggleSave(video.id, user!.id, saved);
    toast.success(next ? "Saved" : "Removed from saved");
  };
  const onDelete = async () => {
    if (!confirm("Delete this video?")) return;
    try {
      await deleteVideo(video);
      toast.success("Video deleted");
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => {});
    else {
      el.pause();
      setPlaying(false);
    }
  };

  const canDelete = user && (user.id === video.user_id || isAdmin);

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[520px] items-end justify-center bg-video-bg md:my-3 md:h-[calc(100vh-1.5rem)] md:overflow-hidden md:rounded-2xl">
      {src ? (
        <video
          ref={ref}
          src={src}
          loop
          playsInline
          muted={muted}
          preload={active ? "auto" : "metadata"}
          onClick={togglePlay}
          onDoubleClick={onLike}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted/20" />
      )}
      {!playing && src && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label="Play">
          <Play className="size-20 fill-on-video/80 text-on-video/80" />
        </button>
      )}

      {/* Bottom info */}
      <div className="video-gradient pointer-events-none absolute inset-x-0 bottom-0 pt-24" />
      <div className="relative z-10 flex w-full items-end gap-3 p-4 pr-20 text-on-video text-shadow-video">
        <div className="min-w-0 flex-1 space-y-1">
          <Link to="/u/$username" params={{ username: video.profile.username }} className="flex items-center gap-2 font-bold">
            <UserAvatar profile={video.profile} size="xs" />@{video.profile.username}
          </Link>
          {video.title && <p className="font-semibold leading-snug">{video.title}</p>}
          {video.description && <p className="line-clamp-2 text-sm/snug opacity-90">{video.description}</p>}
          {video.hashtags.length > 0 && (
            <p className="flex flex-wrap gap-x-2 text-sm font-semibold">
              {video.hashtags.map((t) => (
                <Link key={t} to="/tag/$tag" params={{ tag: t }} className="hover:underline">
                  #{t}
                </Link>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-2 bottom-4 z-10 flex flex-col items-center gap-3 text-on-video">
        <div className="relative mb-1">
          <Link to="/u/$username" params={{ username: video.profile.username }}>
            <UserAvatar profile={video.profile} size="md" className="ring-2 ring-on-video" />
          </Link>
          {user?.id !== video.user_id && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <FollowButton targetId={video.user_id} compact />
            </div>
          )}
        </div>
        <Action icon={<Heart className={cn("size-7 transition-colors", liked && "fill-rose text-rose", pop && "animate-heart")} />} label={formatCount(likeCount)} onClick={onLike} />
        <Action icon={<MessageCircle className="size-7" />} label={formatCount(commentCount)} onClick={() => setComments(true)} />
        <Action icon={<Bookmark className={cn("size-7", saved && "fill-on-video")} />} label={formatCount(saveCount)} onClick={onSave} />
        <Action icon={<Send className="size-7" />} label="Share" onClick={() => setShare(true)} />
        <Button variant="video" size="icon" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="video" size="icon" aria-label="More">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => (requireAuth() ? setReport(true) : null)}>
              <Flag className="mr-2 size-4" /> Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/video/$id", params: { id: video.id } })}>Open video page</DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 size-4" /> Delete{isAdmin && user?.id !== video.user_id ? " (admin)" : ""}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommentsSheet videoId={video.id} open={comments} onOpenChange={setComments} onCountChange={setCommentCount} />
      <ShareDialog video={video} open={share} onOpenChange={setShare} />
      <ReportDialog videoId={video.id} open={report} onOpenChange={setReport} />
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 text-xs font-semibold text-shadow-video">
      <span className="flex size-12 items-center justify-center rounded-full bg-on-video/10 backdrop-blur-sm transition-transform active:scale-90">{icon}</span>
      {label}
    </button>
  );
}
