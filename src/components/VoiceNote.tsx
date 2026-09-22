import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSignedUrl } from "@/lib/media";
import { formatTime } from "@/lib/edit";
import { cn } from "@/lib/utils";

const BARS = [6, 12, 9, 16, 11, 20, 14, 8, 18, 10, 15, 7, 13, 19, 9, 12];

export function VoiceNote({ path, duration, mine }: { path: string; duration?: number | null | undefined; mine?: boolean | undefined }) {
  const { data: src } = useSignedUrl("media", path);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const total = duration || audio.current?.duration || 0;

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setTime(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().then(() => setPlaying(true));
    else {
      el.pause();
      setPlaying(false);
    }
  };

  const pct = total ? time / total : 0;

  return (
    <div className={cn("flex w-52 items-center gap-2 rounded-2xl px-3 py-2", mine ? "bg-rose text-rose-foreground" : "bg-secondary")}>
      {src && <audio ref={audio} src={src} preload="metadata" />}
      <button onClick={toggle} aria-label={playing ? "Pause voice message" : "Play voice message"} className="shrink-0">
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
      <div className="flex h-6 flex-1 items-center gap-0.5">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cn("w-1 rounded-full transition-opacity", i / BARS.length <= pct ? "opacity-100" : "opacity-40")}
            style={{ height: h, background: "currentColor" }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-semibold tabular-nums">{formatTime(playing || time ? time : total)}</span>
    </div>
  );
}
