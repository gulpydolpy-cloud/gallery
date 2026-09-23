import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type SignalMsg =
  | { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };

export function useLiveConnection({
  sessionId,
  userId,
  role,
  gridMemberIds,
}: {
  sessionId: string;
  userId: string;
  role: "grid" | "viewer";
  /** current set of grid-member (host+guest) user ids in the room */
  gridMemberIds: string[];
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [source, setSource] = useState<"camera" | "screen">("camera");
  const [presenceCount, setPresenceCount] = useState(1);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const gridMemberIdsRef = useRef<string[]>(gridMemberIds);
  gridMemberIdsRef.current = gridMemberIds;

  const needsConnectionTo = useCallback((otherId: string) => role === "grid" || gridMemberIdsRef.current.includes(otherId), [role]);

  const ensurePeer = useCallback(
    (otherId: string) => {
      let pc = peersRef.current.get(otherId);
      if (pc) return pc;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(otherId, pc);
      if (localStreamRef.current) for (const track of localStreamRef.current.getTracks()) pc.addTrack(track, localStreamRef.current);
      pc.ontrack = (e) => setRemoteStreams((prev) => ({ ...prev, [otherId]: e.streams[0] }));
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: { kind: "ice", from: userId, to: otherId, candidate: e.candidate.toJSON() } satisfies SignalMsg,
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc && (pc.connectionState === "failed" || pc.connectionState === "closed")) {
          peersRef.current.delete(otherId);
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[otherId];
            return next;
          });
        }
      };
      return pc;
    },
    [userId]
  );

  const closePeer = useCallback((otherId: string) => {
    peersRef.current.get(otherId)?.close();
    peersRef.current.delete(otherId);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[otherId];
      return next;
    });
  }, []);

  const startOfferTo = useCallback(
    async (otherId: string) => {
      const pc = ensurePeer(otherId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({ type: "broadcast", event: "signal", payload: { kind: "offer", from: userId, to: otherId, sdp: offer } satisfies SignalMsg });
    },
    [ensurePeer, userId]
  );

  useEffect(() => {
    if (role !== "grid") return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) return;
        localStreamRef.current = stream;
        setLocalStream(stream);
        for (const [otherId, pc] of peersRef.current.entries()) {
          for (const track of stream.getTracks()) pc.addTrack(track, stream);
          void startOfferTo(otherId);
        }
      })
      .catch(() => {
        /* camera/mic permission denied — can still watch/chat */
      });
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [role, startOfferTo]);

  useEffect(() => {
    const ch = supabase.channel(`live-rtc-${sessionId}`, { config: { presence: { key: userId } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalMsg }) => {
      if (payload.to !== userId) return;
      if (payload.kind === "offer") {
        const pc = ensurePeer(payload.from);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "signal", payload: { kind: "answer", from: userId, to: payload.from, sdp: answer } satisfies SignalMsg });
      } else if (payload.kind === "answer") {
        const pc = peersRef.current.get(payload.from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.kind === "ice") {
        const pc = peersRef.current.get(payload.from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {
            /* candidate arrived before remote description — safe to ignore */
          }
        }
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setPresenceCount(Object.keys(state).length);
      for (const id of Object.keys(state).filter((k) => k !== userId)) {
        if (needsConnectionTo(id) && !peersRef.current.has(id)) void startOfferTo(id);
      }
    });
    ch.on("presence", { event: "join" }, ({ key }: { key: string }) => {
      if (key !== userId && needsConnectionTo(key) && !peersRef.current.has(key)) void startOfferTo(key);
    });
    ch.on("presence", { event: "leave" }, ({ key }: { key: string }) => closePeer(key));

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ role, online_at: new Date().toISOString() });
    });

    return () => {
      supabase.removeChannel(ch);
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
    };
  }, [closePeer, ensurePeer, needsConnectionTo, role, sessionId, startOfferTo, userId]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };
  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
  };

  const switchSource = async (next: "camera" | "screen") => {
    if (role !== "grid") return;
    try {
       const media = next === "screen" ? await navigator.mediaDevices.getDisplayMedia({ video: true }) : await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const newVideoTrack = media.getVideoTracks()[0];
      if (!newVideoTrack) return;
      const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) void sender.replaceTrack(newVideoTrack);
      }
      oldVideoTrack?.stop();
       if (localStreamRef.current) {
        if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
       } else {
         const nextStream = new MediaStream([newVideoTrack]);
         localStreamRef.current = nextStream;
         setLocalStream(nextStream);
      }
      setSource(next);
      newVideoTrack.onended = () => {
        if (next === "screen") void switchSource("camera");
      };
    } catch {
      /* user cancelled the screen-share picker */
    }
  };

  return { localStream, remoteStreams, micOn, cameraOn, source, toggleMic, toggleCamera, switchSource, presenceCount };
}
