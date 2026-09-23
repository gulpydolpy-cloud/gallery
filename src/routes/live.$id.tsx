import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mic, MicOff, Monitor, Radio, Video, VideoOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LiveChat } from "@/components/LiveChat";
import { GiftPanel } from "@/components/GiftPanel";
import { GiftEffectOverlay } from "@/components/GiftEffectOverlay";
import { useAuth } from "@/lib/auth";
import { endLive, joinLive, kickParticipant, leaveLive, useLiveParticipants, useLiveSession } from "@/lib/live";
import { useLiveConnection } from "@/lib/webrtc";
import { useGiftTypes } from "@/lib/gifts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/live/$id")({
  component: LiveRoomPage,
});

function LiveRoomPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: session } = useLiveSession(id);
  const { data: participants = [] } = useLiveParticipants(id);
  const { data: giftTypes = [] } = useGiftTypes();
  const [joining, setJoining] = useState(false);
  const [liveGiftEffect, setLiveGiftEffect] = useState<string | null>(null);

  const isHost = Boolean(user && session && session.host_id === user.id);
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const isGridMember = Boolean(myParticipant);
  const role: "grid" | "viewer" = isGridMember ? "grid" : "viewer";
  const gridMemberIds = useMemo(() => participants.map((p) => p.user_id), [participants]);

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

  // Everyone in the room sees the gift effect, driven by realtime — not just the sender.
  useEffect(() => {
    if (!giftTypes.length) return;
    const ch = supabase
      .channel(`live-gifts-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_events", filter: `live_session_id=eq.${id}` }, (payload) => {
        const giftTypeId = (payload.new as { gift_type_id: string }).gift_type_id;
        const gift = giftTypes.find((g) => g.id === giftTypeId);
        if (gift) setLiveGiftEffect(gift.animation_key);
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [id, giftTypes]);

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
    <div className="flex h-[calc(100vh-3rem)] flex-col bg-video-bg text-white md:h-screen">
      <header className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-rose px-2 py-0.5 text-[10px] font-bold text-rose-foreground">
            <Radio className="size-3" /> LIVE
          </span>
          <p className="truncate text-sm font-semibold">{session.title}</p>
        </div>
        {isHost ? (
          <Button variant="destructive" size="sm" onClick={end}>End Live</Button>
        ) : isGridMember ? (
          <Button variant="outline" size="sm" onClick={leave}><LogOut className="size-4" /> Leave</Button>
        ) : null}
      </header>

      <div className="grid flex-1 grid-cols-2 gap-1 overflow-y-auto p-1 sm:grid-cols-3">
        {participants.map((p) => (
          <div key={p.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
            <VideoTile stream={p.user_id === user?.id ? conn.localStream : conn.remoteStreams[p.user_id]} muted={p.user_id === user?.id} />
            <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold">
              {p.role === "host" && <Radio className="size-3 text-rose" />}
              {p.profile?.username ?? "…"}
            </div>
            {isHost && p.role !== "host" && (
              <button onClick={() => kick(p.user_id)} className="absolute top-1 right-1 rounded-full bg-black/60 p-1" aria-label={`Remove ${p.profile?.username}`}>
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!isGridMember && user && (
        <div className="p-2">
          <Button variant="rose" className="w-full" disabled={joining} onClick={join}>
            {joining ? "Joining…" : "Join as a guest"}
          </Button>
        </div>
      )}

      {isGridMember && (
        <div className="flex items-center justify-center gap-3 p-2">
          <Button variant="secondary" size="icon" onClick={conn.toggleMic}>
            {conn.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={conn.toggleCamera}>
            {conn.cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={() => conn.switchSource(conn.source === "camera" ? "screen" : "camera")} aria-label="Switch camera/screen share">
            <Monitor className="size-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/10 p-2">
        {hostProfile && session.host_id !== user?.id && (
          <GiftPanel recipientId={session.host_id} recipientName={hostProfile.display_name || hostProfile.username} liveSessionId={id} />
        )}
      </div>

      <div className="h-40 border-t border-white/10">
        <LiveChat sessionId={id} canModerate={isHost} />
      </div>

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
