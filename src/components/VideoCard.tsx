import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Play, Repeat2, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareDialog } from "@/components/ShareDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { RepostDialog } from "@/components/RepostDialog";
import { AdminBoostDialog } from "@/components/AdminBoostDialog";
import { FollowButton } from "@/components/FollowButton";
import { VideoOverlays } from "@/components/VideoOverlays";
import { useAuth } from "@/lib/auth";
import { formatCount, useSignedUrl } from "@/lib/media";
import { parseEdit } from "@/lib/edit";
import { timeAgo } from "@/lib/time";
import { deleteVideo, registerView, toggleLike, toggleSave, unrepost, type VideoWithMeta } from "@/lib/videos";
import { cn } from "@/lib/utils";

type Props = { video: VideoWithMeta; active: boolean };

export function VideoCard({ video, active }: Props) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: src } = useSignedUrl("videos", video.storage_path);
  const ref = useRef<HTMLVideoElement>(null);
  const edit = parseEdit(video.edit);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liked, setLiked] = useState(video.liked);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [saved, setSaved] = useState(video.saved);
  const [saveCount, setSaveCount] = useState(video.save_count);
  const [commentCount, setCommentCount] = useState(video.comment_count);
  const [reposted, setReposted] = useState(video.reposted);
  const [repostCount, setRepostCount] = useState(video.repost_count);
  const [shareCount, setShareCount] = useState(video.shares);
  const [pop, setPop] = useState(false);
  const [comments, setComments] = useState(false);
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [boost, setBoost] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = edit.speed;
    el.volume = Math.min(1, edit.volume);
    if (active) {
      if (el.currentTime < edit.trimStart) el.currentTime = edit.trimStart;
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (!viewed.current && user) {
        viewed.current = true;
        void registerView(video.id);
      }
    } else {
      el.pause();
      el.currentTime = edit.trimStart;
      setPlaying(false);
    }
  }, [active, src, user, video.id, edit.speed, edit.volume, edit.trimStart]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      const end = edit.trimEnd || el.duration;
      if (el.currentTime >= end - 0.05 || el.currentTime < edit.trimStart) el.currentTime = edit.trimStart;
      setTime(el.currentTime);
    };
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src, edit.trimStart, edit.trimEnd]);

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
  const onRepost = async () => {
    if (!requireAuth()) return;
    if (reposted) {
      setReposted(false);
      setRepostCount((c) => Math.max(0, c - 1));
      await unrepost(video.id, user!.id);
      toast.success("Repost removed");
      qc.invalidateQueries({ queryKey: ["feed"] });
      return;
    }
    setRepostOpen(true);
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

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!el || !rect.width) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const start = edit.trimStart;
    const end = edit.trimEnd || duration || el.duration || 0;
    el.currentTime = start + ratio * Math.max(0, end - start);
  };

  const canDelete = user && (user.id === video.user_id || isAdmin);
  const start = edit.trimStart;
  const end = edit.trimEnd || duration;
  const progress = end > start ? Math.min(1, Math.max(0, (time - start) / (end - start))) : 0;

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[520px] items-end justify-center bg-video-bg md:my-3 md:h-[calc(100vh-1.5rem)] md:overflow-hidden md:rounded-2xl">
      {src ? (
        <video
          ref={ref}
          src={src}
          loop
          playsInline
          preload={active ? "auto" : "metadata"}
          onClick={togglePlay}
          onDoubleClick={onLike}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted/20" />
      )}
      <VideoOverlays edit={edit} time={time} />
      {!playing && src && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label="Play">
          <Play className="size-20 fill-on-video/80 text-on-video/80" />
        </button>
      )}

      {video.repost && (
        <p className="absolute top-3 left-3 z-10 max-w-[70%] truncate rounded-full bg-video-bg/60 px-3 py-1 text-xs font-semibold text-on-video">
          🔁 Reposted by @{video.repost.profile.username}
          {video.repost.note ? `: ${video.repost.note}` : ""}
        </p>
      )}

      {/* Bottom info */}
      <div className="video-gradient pointer-events-none absolute inset-x-0 bottom-0 pt-24" />
      <div className="relative z-10 flex w-full items-end gap-3 p-4 pr-20 pb-7 text-on-video text-shadow-video">
        <div className="min-w-0 flex-1 space-y-1">
          <Link to="/u/$username" params={{ username: video.profile.username }} className="flex items-center gap-2 font-bold">
            <UserAvatar profile={video.profile} size="xs" />@{video.profile.username}
            <span className="text-xs font-medium opacity-80">· {timeAgo(video.created_at)}</span>
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

      {/* Scrubber */}
      <div onPointerDown={seek} onPointerMove={(e) => e.buttons === 1 && seek(e)} className="absolute inset-x-0 bottom-0 z-20 cursor-pointer px-3 py-3 touch-none">
        <div className="h-1 w-full rounded-full bg-on-video/25">
          <div className="relative h-1 rounded-full bg-on-video" style={{ width: `${progress * 100}%` }}>
            <span className="absolute -top-1 -right-1.5 size-3 rounded-full bg-on-video" />
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-2 bottom-8 z-20 flex flex-col items-center gap-3 text-on-video">
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
        <Action icon={<Repeat2 className={cn("size-7", reposted && "text-rose")} />} label={formatCount(repostCount)} onClick={onRepost} />
        <Action icon={<Bookmark className={cn("size-7", saved && "fill-on-video")} />} label={formatCount(saveCount)} onClick={onSave} />
        <Action icon={<Send className="size-7" />} label={formatCount(shareCount)} onClick={() => setShare(true)} />
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
            {isAdmin && (
              <DropdownMenuItem onClick={() => setBoost(true)}>
                <Sparkles className="mr-2 size-4" /> Boost likes / views
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 size-4" /> Delete{isAdmin && user?.id !== video.user_id ? " (admin)" : ""}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommentsSheet videoId={video.id} open={comments} onOpenChange={setComments} onCountChange={setCommentCount} />
      <ShareDialog video={video} open={share} onOpenChange={setShare} onShared={() => setShareCount((c) => c + 1)} />
      <ReportDialog videoId={video.id} open={report} onOpenChange={setReport} />
      {user && (
        <RepostDialog
          videoId={video.id}
          userId={user.id}
          open={repostOpen}
          onOpenChange={setRepostOpen}
          onDone={() => {
            setReposted(true);
            setRepostCount((c) => c + 1);
          }}
        />
      )}
{isAdmin && <AdminBoostDialog videoId={video.id} creatorId={video.user_id} open={boost} onOpenChange={setBoost} />}
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
