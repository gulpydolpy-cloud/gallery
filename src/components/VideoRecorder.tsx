import { Circle, RefreshCw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function VideoRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      } catch {
        toast.error("Camera or microphone access was denied");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const start = () => {
    if (!streamRef.current) return;
    const mime = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onRecorded(new File(chunks.current, `recording-${Date.now()}.${ext}`, { type }));
    };
    rec.start(250);
    recRef.current = rec;
    setSeconds(0);
    setRecording(true);
  };
  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-video-bg">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
      {recording && (
        <span className="absolute top-3 left-3 rounded-full bg-rose px-2 py-0.5 text-xs font-bold text-rose-foreground">
          ● {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-6">
        <Button variant="video" size="icon" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} disabled={recording} aria-label="Flip camera">
          <RefreshCw />
        </Button>
        <button
          onClick={recording ? stop : start}
          disabled={!ready}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className="flex size-16 items-center justify-center rounded-full border-4 border-on-video bg-rose text-rose-foreground disabled:opacity-50"
        >
          {recording ? <Square className="size-6 fill-current" /> : <Circle className="size-8 fill-current" />}
        </button>
        <span className="size-12" />
      </div>
    </div>
  );
}
