import { Eye, Gift as GiftIcon, Heart, Mic, MicOff, MonitorUp, RotateCcw, UserPlus, Video, VideoOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LiveChat } from "@/components/LiveChat";
import { GiftPanel } from "@/components/GiftPanel";
import { GiftEffectOverlay } from "@/components/GiftEffectOverlay";
import { AddGuestDialog } from "@/components/AddGuestDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";
import { endLive, kickParticipant, likeLive, useLiveParticipants, useLiveSession } from "@/lib/live";
import { useLiveConnection } from "@/lib/webrtc";
import { useGiftTypes } from "@/lib/gifts";
import { supabase } from "@/integrations/supabase/client";

type FloatingHeart = { id: number; left: number };
type ProfileLite = { id?: string; username: string; display_name?: string | null; avatar_path?: string | null };

const HOST_GRADIENT = "bg-gradient-to-br from-pink-200 to-pink-300";
const GUEST_GRADIENTS = [
  "bg-gradient-to-br from-orange-200 to-orange-300",
  "bg-gradient-to-br from-green-200 to-emerald-200",
  "bg-gradient-to-br from-sky-200 to-blue-200",
  "bg-gradient-to-br from-yellow-100 to-yellow-200",
  "bg-gradient-to-br from-purple-200 to-purple-300",
  "bg-gradient-to-br from-orange-50 to-amber-100",
];
function guestGradient(slot: number) {
  return GUEST_GRADIENTS[(slot - 1) % GUEST_GRADIENTS.length];
}

export function LiveRoomView({
  sessionId,
  active,
  onClose,
  headerExtra,
}: {
  sessionId: string;
  active: boolean;
  onClose?: () => void;
  headerExtra?: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: session } = useLiveSession(sessionId);
  const { data: participants = [] } = useLiveParticipants(sessionId);
  const { data: giftTypes = [] } = useGiftTypes();
  const [liveGiftEffect, setLiveGiftEffect] = useState<string | null>(null);
  const [lastGiftLine, setLastGiftLine] = useState<string | null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [displayedLikes, setDisplayedLikes] = useState(0);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const isHost = Boolean(user && session && session.host_id === user.id);
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const isGridMember = Boolean(myParticipant);
  const role: "grid" | "viewer" = isGridMember ? "grid" : "viewer";
  const gridMemberIds = useMemo(() => participants.map((p) => p.user_id), [participants]);
  const host = participants.find((p) => p.role === "host");
  const guests = participants.filter((p) => p.role !== "host");

  const { data: hostProfile } = useQuery({
    queryKey: ["profile-lite", session?.host_id],
    enabled: Boolean(session?.host_id),
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_path").eq("id", session!.host_id).maybeSingle()).data as ProfileLite | null,
  });

  const conn = useLiveConnection({
    sessionId,
    userId: user?.id ?? `anon-${sessionId}`,
    role: user ? role : "viewer",
    gridMemberIds,
    enabled: active,
  });

  useEffect(() => {
    if (session) setDisplayedLikes(session.like_count);
  }, [session]);

  useEffect(() => {
    if (!active || !giftTypes.length) return;
    const ch = supabase
      .channel(`live-gifts-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_events", filter: `live_session_id=eq.${sessionId}` }, async (payload) => {
        const row = payload.new as { gift_type_id: string; sender_id: string };
        const gift = giftTypes.find((g) => g.id === row.gift_type_id);
        if (gift) setLiveGiftEffect(gift.animation_key);
        const { data: sender } = await supabase.from("profiles").select("username, display_name").eq("id", row.sender_id).maybeSingle();
        if (gift && sender) {
          const label = sender.display_name || sender.username;
          setLastGiftLine(`${label} sent ${gift.name}`);
          setTimeout(() => setLastGiftLine((cur) => (cur?.startsWith(label) ? null : cur)), 4000);
        }
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [active, sessionId, giftTypes]);

  const addLike = () => {
    if (!user) return;
    const heartId = heartIdRef.current++;
    setHearts((prev) => [...prev, { id: heartId, left: 40 + Math.random() * 20 }]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== heartId)), 1400);
    setDisplayedLikes((count) => count + 1);
    likeLive(sessionId).then(setDisplayedLikes).catch(() => setDisplayedLikes((count) => Math.max(0, count - 1)));
  };

  // Desktop: the heart button in the header is the only way to like.
  // Touch devices: double-tap anywhere on the video also works.
  const handlePointerUp = () => {
    if (!isTouchDevice) return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      addLike();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  if (!session) return <div className="flex h-full items-center justify-center bg-video-bg text-on-video/60">Loading live…</div>;
  if (session.status === "ended") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-video-bg p-10 text-center text-on-video">
        <p className="text-lg font-semibold">This live has ended</p>
        {onClose && <Button variant="outline" onClick={onClose}>Back</Button>}
      </div>
    );
  }

  const end = async () => {
    if (!confirm("End this live for everyone?")) return;
    await endLive(sessionId).catch((err) => toast.error((err as Error).message));
  };

  const kick = async (targetId: string) => {
    try {
      await kickParticipant(sessionId, targetId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-video-bg text-on-video">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
        <div className="flex min-w-0 items-center gap-2">
          {hostProfile && (
            <div className="rounded-full ring-2 ring-rose ring-offset-2 ring-offset-video-bg">
              <UserAvatar profile={hostProfile} size="sm" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{hostProfile?.display_name || hostProfile?.username}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose px-1.5 py-[1px] text-[9px] font-extrabold">LIVE</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-semibold">
            <Eye className="size-3.5" /> {conn.presenceCount}
          </span>
          <button
            type="button"
            onClick={addLike}
            className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-semibold"
            aria-label="Like this live"
          >
            <Heart className="size-3.5 fill-rose text-rose" /> {displayedLikes}
          </button>
                  {headerExtra}
          <GiftPanel
            liveSessionId={sessionId}
            trigger={
              <Button type="button" variant="video" size="icon" className="size-8 bg-black/40" aria-label="Send gift">
                <GiftIcon className="size-4" />
              </Button>
            }
          />
          {onClose && !isGridMember && (
            <Button type="button" variant="video" size="icon" onClick={onClose} className="size-8 bg-black/40" aria-label="Close">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="relative flex-1 touch-manipulation overflow-hidden" onPointerUp={handlePointerUp}>
        {guests.length === 0 ? (
          <div className="h-full p-1 pt-16 pb-20">
            <div className={`relative h-full w-full overflow-hidden rounded-md ${HOST_GRADIENT}`}>
              {host && (
                <VideoTile
                  stream={host.user_id === user?.id ? conn.localStream : conn.remoteStreams[host.user_id]}
                  muted={host.user_id === user?.id}
                  profile={host.profile}
                  cameraOn={host.user_id !== user?.id || conn.cameraOn}
                />
              )}
              <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold">Host</span>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-3 grid-rows-4 gap-1 p-1 pt-16 pb-44 sm:grid-cols-4 sm:grid-rows-3 sm:pb-48">
            <div className={`relative col-span-2 row-span-2 overflow-hidden rounded-md sm:row-span-3 ${HOST_GRADIENT}`}>
              {host && (
                <VideoTile
                  stream={host.user_id === user?.id ? conn.localStream : conn.remoteStreams[host.user_id]}
                  muted={host.user_id === user?.id}
                  profile={host.profile}
                  cameraOn={host.user_id !== user?.id || conn.cameraOn}
                />
              )}
              <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold">Host</span>
            </div>
            {Array.from({ length: 8 }, (_, index) => guests[index]).map((guest, index) => (
              <div
                key={guest?.id ?? `empty-${index}`}
                className={`relative min-h-0 overflow-hidden rounded-md ${guest ? guestGradient(guest.slot) : "bg-secondary"} ${index >= 6 ? "sm:hidden" : ""}`}
              >
                {guest ? (
                  <VideoTile
                    stream={guest.user_id === user?.id ? conn.localStream : conn.remoteStreams[guest.user_id]}
                    muted={guest.user_id === user?.id}
                    profile={guest.profile}
                    cameraOn={guest.user_id !== user?.id || conn.cameraOn}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-on-video/20">
                    <VideoOff className="size-7" />
                  </div>
                )}
                {guest && (
                  <span className="absolute inset-x-1 bottom-1 flex items-center gap-1 truncate text-[9px] font-semibold text-shadow-video">
                    {guest.profile?.username}
                    <MicOff className="size-2.5 opacity-70" />
                  </span>
                )}
                {isHost && guest && (
                  <Button type="button" variant="video" size="icon" onClick={() => kick(guest.user_id)} className="absolute right-0.5 top-0.5 size-6 bg-black/60" aria-label={`Remove ${guest.profile?.username}`}>
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {hearts.map((h) => (
          <Heart key={h.id} className="pointer-events-none absolute bottom-20 z-10 size-8 fill-rose text-rose animate-gift-burst" style={{ left: `${h.left}%` }} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 bg-gradient-to-t from-video-bg via-video-bg/75 to-transparent pt-12">
        {lastGiftLine && (
          <p className="mx-3 mb-1 w-fit max-w-[85%] rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
            <span className="mr-1">🎁</span>{lastGiftLine}
          </p>
        )}
        <div className="pointer-events-auto h-32 sm:h-36">
          <LiveChat sessionId={sessionId} canModerate={isHost} />
        </div>
      </div>

      {isGridMember && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-14 flex-wrap items-center justify-center gap-2 border-t border-on-video/10 bg-video-bg/90 px-2 backdrop-blur-sm">
          <Button variant="secondary" size="icon" onClick={conn.toggleMic} aria-label={conn.micOn ? "Mute microphone" : "Turn on microphone"}>
            {conn.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={conn.toggleCamera} aria-label={conn.cameraOn ? "Turn off camera" : "Turn on camera"}>
            {conn.cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          {isHost && (
            <>
              <Button variant="secondary" size="icon" onClick={() => setAddGuestOpen(true)} aria-label="Add a guest">
                <UserPlus className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => conn.switchSource(conn.source === "camera" ? "screen" : "camera")} aria-label="Switch camera or screen share">
                {conn.source === "camera" ? <MonitorUp className="size-4" /> : <RotateCcw className="size-4" />}
                <span>{conn.source === "camera" ? "Share screen" : "Camera"}</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={end}>End Live</Button>
            </>
          )}
        </div>
      )}

      {isHost && <AddGuestDialog sessionId={sessionId} open={addGuestOpen} onOpenChange={setAddGuestOpen} excludeIds={gridMemberIds} />}
      {liveGiftEffect && <GiftEffectOverlay animationKey={liveGiftEffect} onDone={() => setLiveGiftEffect(null)} />}
    </div>
  );
}

function VideoTile({ stream, muted, profile, cameraOn }: { stream: MediaStream | null | undefined; muted: boolean; profile: ProfileLite | undefined; cameraOn: boolean }) {
  return (
    <>
      {(!stream || !cameraOn) && profile && (
        <div className="absolute inset-0 flex items-center justify-center">
          <UserAvatar profile={profile} size="lg" />
        </div>
      )}
      <video
        ref={(el) => {
          if (el) el.srcObject = stream ?? null;
        }}
        autoPlay
        playsInline
        muted={muted}
        className={`relative size-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
