import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Gift as GiftIcon, Heart, Mic, MicOff, Monitor, Radio, Video, VideoOff, X } from "lucide-react";
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
  const heartIdRef = useRef(0);

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

  const handleDoubleTapLike = () => {
    if (!user) return;
    const heartId = heartIdRef.current++;
    setHearts((prev) => [...prev, { id: heartId, left: 40 + Math.random() * 20 }]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== heartId)), 1400);
    likeLive(id).catch(() => {});
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
    <div className="relative flex h-[100dvh] flex-col bg-black text-white">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex min-w-0 items-center gap-2">
          {hostProfile && <UserAvatar profile={hostProfile} size="sm" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{hostProfile?.display_name || hostProfile?.username}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose px-1.5 py-[1px] text-[9px] font-extrabold">LIVE</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-semibold">
            <Eye className="size-3.5" /> {conn.presenceCount}
          </span>
          {hostProfile && session.host_id !== user?.id && (
            <GiftPanel
              recipientId={session.host_id}
              recipientName={hostProfile.display_name || hostProfile.username}
              liveSessionId={id}
              trigger={
                <button className="rounded-full bg-black/40 p-1.5" aria-label="Send gift">
                  <GiftIcon className="size-4" />
                </button>
              }
            />
          )}
          {!isGridMember && (
            <button onClick={() => navigate({ to: "/live" })} className="rounded-full bg-black/40 p-1.5" aria-label="Close">
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>

      {/* Video area: main host tile + guest grid, double-tap anywhere to like */}
      <div className="relative flex-1 overflow-hidden" onDoubleClick={handleDoubleTapLike}>
        <div className="flex h-full gap-1 p-1 pt-16">
          <div className="relative w-2/3 overflow-hidden rounded-lg bg-neutral-900">
            {host && <VideoTile stream={host.user_id === user?.id ? conn.localStream : conn.remoteStreams[host.user_id]} muted={host.user_id === user?.id} />}
            <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold">
              <Radio className="size-3 text-rose" /> {host?.profile?.username ?? "Host"}
            </span>
          </div>
          <div className="flex w-1/3 flex-col gap-1 overflow-y-auto">
            {guests.map((g) => (
              <div key={g.id} className="relative aspect-square shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                <VideoTile stream={g.user_id === user?.id ? conn.localStream : conn.remoteStreams[g.user_id]} muted={g.user_id === user?.id} />
                <span className="absolute bottom-0.5 left-0.5 truncate rounded-full bg-black/50 px-1.5 py-[1px] text-[9px] font-semibold">{g.profile?.username}</span>
                {isHost && (
                  <button onClick={() => kick(g.user_id)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5" aria-label={`Remove ${g.profile?.username}`}>
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {hearts.map((h) => (
          <Heart key={h.id} className="pointer-events-none absolute bottom-20 z-10 size-8 fill-rose text-rose animate-gift-burst" style={{ left: `${h.left}%` }} />
        ))}
      </div>

      {/* Gift ticker */}
      {lastGiftLine && (
        <p className="bg-black/60 px-3 py-1 text-xs font-medium text-white/90">🎁 {lastGiftLine}</p>
      )}

      {/* Chat */}
      <div className="max-h-[32vh] border-t border-white/10">
        <LiveChat sessionId={id} canModerate={isHost} />
      </div>

      {/* Join CTA for viewers who want to hop into the grid */}
      {!isGridMember && user && (
        <div className="p-2">
          <Button variant="rose" className="w-full" disabled={joining} onClick={join}>
            {joining ? "Joining…" : "Join as a guest"}
          </Button>
        </div>
      )}

      {/* Bottom control bar for host/guests */}
      {isGridMember && (
        <div className="flex items-center justify-center gap-3 border-t border-white/10 p-2">
          <Button variant="secondary" size="icon" onClick={conn.toggleMic}>
            {conn.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={conn.toggleCamera}>
            {conn.cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          {!isHost && (
            <Button variant="outline" size="sm" onClick={leave}>Leave</Button>
          )}
          {isHost && (
            <>
              <Button variant="secondary" size="icon" onClick={() => conn.switchSource(conn.source === "camera" ? "screen" : "camera")} aria-label="Switch camera/screen share">
                <Monitor className="size-4" />
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

function VideoTile({ stream, muted }: { stream: MediaStream | null | undefined; muted: boolean }) {
  return (
    <video
      ref={(el) => {
        if (el && stream) el.srcObject = stream;
      }}
      autoPlay
      playsInline
      muted={muted}
      className="size-full object-cover"
    />
  );
}
