import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Gift as GiftIcon, Heart, Mic, MicOff, MonitorUp, Radio, RotateCcw, Video, VideoOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LiveChat } from "@/components/LiveChat";
import { GiftPanel } from "@/components/GiftPanel";
import { GiftEffectOverlay } from "@/components/GiftEffectOverlay";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";
import { endLive, joinLive, kickParticipant, leaveLive, likeLive, useLiveParticipants, useLiveSession } from "@/lib/live";
import { useLiveConnection } from "@/lib/webrtc";
import { useGiftTypes } from "@/lib/gifts";
import { supabase } from "@/integrations/supabase/client";

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

type FloatingHeart = { id: number; left: number };

function LiveRoomPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: session } = useLiveSession(id);
  const { data: participants = [] } = useLiveParticipants(id);
  const { data: giftTypes = [] } = useGiftTypes();
  const [joining, setJoining] = useState(false);
  const [liveGiftEffect, setLiveGiftEffect] = useState<string | null>(null);
  const [lastGiftLine, setLastGiftLine] = useState<string | null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [displayedLikes, setDisplayedLikes] = useState(0);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);

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
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_path").eq("id", session!.host_id).maybeSingle()).data,
  });

  const conn = useLiveConnection({
    sessionId: id,
    userId: user?.id ?? `anon-${id}`,
    role: user ? role : "viewer",
    gridMemberIds,
  });

  useEffect(() => {
    if (session) setDisplayedLikes(session.like_count);
  }, [session]);

  // Gift animations + ticker line, driven by realtime so everyone in the room sees them.
  useEffect(() => {
    if (!giftTypes.length) return;
    const ch = supabase
      .channel(`live-gifts-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_events", filter: `live_session_id=eq.${id}` }, async (payload) => {
        const row = payload.new as { gift_type_id: string; sender_id: string };
        const gift = giftTypes.find((g) => g.id === row.gift_type_id);
        if (gift) setLiveGiftEffect(gift.animation_key);
        const { data: sender } = await supabase.from("profiles").select("username, display_name").eq("id", row.sender_id).maybeSingle();
        if (gift && sender) {
          setLastGiftLine(`${sender.display_name || sender.username} sent ${gift.name}`);
          setTimeout(() => setLastGiftLine((cur) => (cur?.startsWith(sender.display_name || sender.username) ? null : cur)), 4000);
        }
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [id, giftTypes]);

  const addLike = () => {
    if (!user) return;
    const heartId = heartIdRef.current++;
    setHearts((prev) => [...prev, { id: heartId, left: 40 + Math.random() * 20 }]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== heartId)), 1400);
    setDisplayedLikes((count) => count + 1);
    likeLive(id).then(setDisplayedLikes).catch(() => setDisplayedLikes((count) => Math.max(0, count - 1)));
  };

  const handlePointerUp = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      addLike();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  if (!session) return <div className="p-10 text-center text-muted-foreground">Loading live…</div>;
  if (session.status === "ended") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-lg font-semibold">This live has ended</p>
        <Button variant="outline" onClick={() => navigate({ to: "/live" })}>Back to Live</Button>
      </div>
    );
  }

  const join = async () => {
    if (!user) return navigate({ to: "/auth" });
    setJoining(true);
    try {
      await joinLive(id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    await leaveLive(id).catch(() => {});
    navigate({ to: "/live" });
  };

  const end = async () => {
    if (!confirm("End this live for everyone?")) return;
    await endLive(id).catch((err) => toast.error((err as Error).message));
    navigate({ to: "/live" });
  };

  const kick = async (targetId: string) => {
    try {
      await kickParticipant(id, targetId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-7rem)] min-h-[560px] w-full max-w-6xl flex-col overflow-hidden bg-video-bg text-on-video md:h-screen md:min-h-0">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-video-bg/75 p-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          {hostProfile && <UserAvatar profile={hostProfile} size="sm" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{hostProfile?.display_name || hostProfile?.username}</p>
            <p className="truncate text-[11px] text-on-video/65">@{hostProfile?.username}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-semibold">
            <Eye className="size-3.5" /> {conn.presenceCount}
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-semibold sm:flex">
            <Heart className="size-3.5 fill-rose text-rose" /> {displayedLikes}
          </span>
          {hostProfile && session.host_id !== user?.id && (
            <GiftPanel
              recipientId={session.host_id}
              recipientName={hostProfile.display_name || hostProfile.username}
              liveSessionId={id}
              trigger={
                <Button type="button" variant="video" size="icon" className="size-8 bg-black/40" aria-label="Send gift">
                  <GiftIcon className="size-4" />
                </Button>
              }
            />
          )}
          {!isGridMember && (
            <Button type="button" variant="video" size="icon" onClick={() => navigate({ to: "/live" })} className="size-8 bg-black/40" aria-label="Close">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Video area: main host tile + guest grid, double-tap anywhere to like */}
      <div className="relative flex-1 overflow-hidden touch-manipulation" onPointerUp={handlePointerUp}>
        <div className="grid h-full grid-cols-3 grid-rows-4 gap-1 p-1 pt-16 pb-44 sm:grid-cols-4 sm:grid-rows-3 sm:pb-48">
          <div className="relative col-span-2 row-span-3 overflow-hidden rounded-md bg-secondary sm:row-span-3">
            {host && <VideoTile stream={host.user_id === user?.id ? conn.localStream : conn.remoteStreams[host.user_id]} muted={host.user_id === user?.id} profile={host.profile} cameraOn={host.user_id !== user?.id || conn.cameraOn} />}
            <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold">
              <Radio className="size-3 text-rose" /> {host?.profile?.username ?? "Host"}
            </span>
          </div>
          {Array.from({ length: 8 }, (_, index) => guests[index]).map((guest, index) => (
              <div key={guest?.id ?? `empty-${index}`} className="relative min-h-0 overflow-hidden rounded-md bg-secondary">
                {guest ? <VideoTile stream={guest.user_id === user?.id ? conn.localStream : conn.remoteStreams[guest.user_id]} muted={guest.user_id === user?.id} profile={guest.profile} cameraOn={guest.user_id !== user?.id || conn.cameraOn} /> : <div className="flex size-full items-center justify-center text-on-video/20"><UserAvatarPlaceholder /></div>}
                {guest && (
                  <span className="absolute inset-x-1 bottom-1 truncate text-[9px] font-semibold text-shadow-video">{guest.profile?.username}</span>
                )}
                {isHost && guest && (
                  <Button type="button" variant="video" size="icon" onClick={() => kick(guest.user_id)} className="absolute right-0.5 top-0.5 size-6 bg-black/60" aria-label={`Remove ${guest.profile?.username}`}>
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            ))}
        </div>

        {hearts.map((h) => (
          <Heart key={h.id} className="pointer-events-none absolute bottom-20 z-10 size-8 fill-rose text-rose animate-gift-burst" style={{ left: `${h.left}%` }} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 bg-gradient-to-t from-video-bg via-video-bg/75 to-transparent pt-12">
      {lastGiftLine && (
        <p className="mx-3 mb-1 w-fit max-w-[85%] rounded-full bg-rose/90 px-3 py-1 text-xs font-semibold text-rose-foreground">🎁 {lastGiftLine}</p>
      )}
      <div className="pointer-events-auto h-32 sm:h-36">
        <LiveChat sessionId={id} canModerate={isHost} />
      </div>
      </div>

      {/* Join CTA for viewers who want to hop into the grid */}
      {!isGridMember && user && (
        <div className="absolute inset-x-0 bottom-2 z-30 px-3">
          <Button variant="rose" className="w-full" disabled={joining} onClick={join}>
            {joining ? "Joining…" : "Join as a guest"}
          </Button>
        </div>
      )}

      {/* Bottom control bar for host/guests */}
      {isGridMember && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-14 items-center justify-center gap-2 border-t border-on-video/10 bg-video-bg/90 px-2 backdrop-blur-sm">
          <Button variant="secondary" size="icon" onClick={conn.toggleMic} aria-label={conn.micOn ? "Mute microphone" : "Turn on microphone"}>
            {conn.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={conn.toggleCamera} aria-label={conn.cameraOn ? "Turn off camera" : "Turn on camera"}>
            {conn.cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          {!isHost && (
            <Button variant="outline" size="sm" onClick={leave}>Leave</Button>
          )}
          {isHost && (
            <>
              <Button variant="secondary" size="sm" onClick={() => conn.switchSource(conn.source === "camera" ? "screen" : "camera")} aria-label="Switch camera or screen share">
                {conn.source === "camera" ? <MonitorUp className="size-4" /> : <RotateCcw className="size-4" />}
                <span className="hidden sm:inline">{conn.source === "camera" ? "Share screen" : "Camera"}</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={end}>End Live</Button>
            </>
          )}
        </div>
      )}

      {liveGiftEffect && <GiftEffectOverlay animationKey={liveGiftEffect} onDone={() => setLiveGiftEffect(null)} />}
    </div>
  );
}

function UserAvatarPlaceholder() {
  return <VideoOff className="size-7" />;
}

function VideoTile({ stream, muted, profile, cameraOn }: { stream: MediaStream | null | undefined; muted: boolean; profile?: { username: string; display_name?: string | null; avatar_path?: string | null }; cameraOn: boolean }) {
  return (
    <>
      {(!stream || !cameraOn) && profile && <div className="absolute inset-0 flex items-center justify-center"><UserAvatar profile={profile} size="lg" /></div>}
      <video
        ref={(el) => {
          if (el) el.srcObject = stream ?? null;
        }}
        autoPlay
        playsInline
        muted={muted}
        className="relative size-full object-cover"
      />
    </>
  );
}
