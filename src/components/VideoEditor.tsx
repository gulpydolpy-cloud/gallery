import { ImagePlus, Redo2, Smile, Trash2, Type, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OverlayItem } from "@/components/VideoOverlays";
import { StickerPicker } from "@/components/StickerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  defaultEdit,
  EDITOR_COLORS,
  EDITOR_FONTS,
  formatTime,
  isVisible,
  newMediaOverlay,
  newTextOverlay,
  type Overlay,
  type VideoEdit,
} from "@/lib/edit";
import { extFor, uploadToMedia } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export function VideoEditor({ src, userId, edit, onChange }: { src: string; userId: string; edit: VideoEdit; onChange: (e: VideoEdit) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const past = useRef<VideoEdit[]>([]);
  const future = useRef<VideoEdit[]>([]);
  const drag = useRef<{ id: string } | null>(null);

  const trimEnd = edit.trimEnd || duration;
  const sel = edit.overlays.find((o) => o.id === selected) ?? null;

  const commit = (next: VideoEdit) => {
    past.current = [...past.current.slice(-24), edit];
    future.current = [];
    onChange(next);
  };
  const patch = (partial: Partial<VideoEdit>) => commit({ ...edit, ...partial });
  const patchOverlay = (id: string, partial: Partial<Overlay>) =>
    onChange({ ...edit, overlays: edit.overlays.map((o) => (o.id === id ? { ...o, ...partial } : o)) });

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [edit, ...future.current];
    onChange(prev);
  };
  const redo = () => {
    const [next, ...rest] = future.current;
    if (!next) return;
    past.current = [...past.current, edit];
    future.current = rest;
    onChange(next);
  };

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const onTime = () => {
      if (el.currentTime > (edit.trimEnd || el.duration)) el.currentTime = edit.trimStart;
      if (el.currentTime < edit.trimStart) el.currentTime = edit.trimStart;
      setTime(el.currentTime);
    };
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [edit.trimStart, edit.trimEnd, src]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.playbackRate = edit.speed;
    el.volume = Math.min(1, edit.volume);
  }, [edit.speed, edit.volume]);

  const addText = () => {
    const o = newTextOverlay(duration, time);
    commit({ ...edit, overlays: [...edit.overlays, o] });
    setSelected(o.id);
  };
  const addSticker = (path: string) => {
    const o = newMediaOverlay("sticker", path, duration, time);
    commit({ ...edit, overlays: [...edit.overlays, o] });
    setSelected(o.id);
  };
  const addImage = async (file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadToMedia(userId, file, "overlays", extFor(file, "jpg"));
      const o = newMediaOverlay("image", path, duration, time);
      commit({ ...edit, overlays: [...edit.overlays, o] });
      setSelected(o.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const removeSelected = () => {
    if (!sel) return;
    commit({ ...edit, overlays: edit.overlays.filter((o) => o.id !== sel.id) });
    setSelected(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const rect = canvas.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    patchOverlay(d.id, { x, y });
  };

  return (
    <div className="space-y-3">
      <div
        ref={canvas}
        className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-video-bg"
        style={{ containerType: "size" }}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
      >
        <video ref={video} src={src} playsInline controls className="absolute inset-0 h-full w-full object-contain" />
        {edit.overlays.filter((o) => isVisible(o, time)).map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => {
              e.preventDefault();
              setSelected(o.id);
              drag.current = { id: o.id };
            }}
            className="absolute inset-0 touch-none"
            style={{ pointerEvents: "none" }}
          >
            <div style={{ pointerEvents: "auto", cursor: "grab" }}>
              <OverlayItem o={o} selected={o.id === selected} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addText}><Type /> Text</Button>
        <Popover>
          <PopoverTrigger asChild><Button type="button" variant="outline" size="sm"><Smile /> Sticker</Button></PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start"><StickerPicker onPick={addSticker} /></PopoverContent>
        </Popover>
        <Button type="button" variant="outline" size="sm" asChild>
          <label className="cursor-pointer"><ImagePlus /> Image<input type="file" accept="image/*" className="hidden" onChange={(e) => addImage(e.target.files?.[0] ?? null)} /></label>
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Undo" onClick={undo}><Undo2 /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Redo" onClick={redo}><Redo2 /></Button>
        {sel && <Button type="button" variant="ghost" size="icon" aria-label="Delete layer" className="text-destructive" onClick={removeSelected}><Trash2 /></Button>}
      </div>

      {sel && (
        <div className="space-y-3 rounded-xl border p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">Selected layer</p>
          {sel.kind === "text" ? (
            <>
              <Input value={sel.text} onChange={(e) => patchOverlay(sel.id, { text: e.target.value })} placeholder="Your text" maxLength={120} />
              <div className="flex flex-wrap gap-2">
                {EDITOR_FONTS.map((f) => (
                  <button key={f.value} type="button" onClick={() => patchOverlay(sel.id, { font: f.value })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", sel.font === f.value ? "bg-rose text-rose-foreground" : "bg-secondary")} style={{ fontFamily: f.value }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {EDITOR_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchOverlay(sel.id, { color: c })} className={cn("size-6 rounded-full border", sel.color === c && "ring-2 ring-rose")} style={{ background: c }} />
                ))}
                <button type="button" onClick={() => patchOverlay(sel.id, { bg: sel.bg === "none" ? "#000000" : "none" })} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                  {sel.bg === "none" ? "Add pill" : "Remove pill"}
                </button>
              </div>
              <Row label={`Size ${sel.size.toFixed(0)}`}>
                <Slider value={[sel.size]} min={3} max={18} step={0.5} onValueChange={(v) => patchOverlay(sel.id, { size: v[0] ?? sel.size })} />
              </Row>
            </>
          ) : (
            <Row label={`Size ${(sel.scale * 100).toFixed(0)}%`}>
              <Slider value={[sel.scale]} min={0.1} max={1} step={0.01} onValueChange={(v) => patchOverlay(sel.id, { scale: v[0] ?? sel.scale })} />
            </Row>
          )}
          <Row label={`Rotation ${sel.rotation.toFixed(0)}°`}>
            <Slider value={[sel.rotation]} min={-180} max={180} step={1} onValueChange={(v) => patchOverlay(sel.id, { rotation: v[0] ?? sel.rotation })} />
          </Row>
          <Row label={`Shows ${formatTime(sel.start)} – ${formatTime(sel.end)}`}>
            <Slider
              value={[sel.start, sel.end]}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              onValueChange={(v) => {
                const s = v[0] ?? 0;
                const e = v[1] ?? s + 0.2;
                patchOverlay(sel.id, { start: s, end: Math.max(e, s + 0.2) });
              }}
            />
          </Row>
        </div>
      )}

      <div className="space-y-3 rounded-xl border p-3">
        <Row label={`Speed ${edit.speed.toFixed(2)}×`}>
          <Slider value={[edit.speed]} min={0.5} max={2} step={0.05} onValueChange={(v) => patch({ speed: v[0] ?? edit.speed })} />
        </Row>
        <Row label={`Volume ${(edit.volume * 100).toFixed(0)}%`}>
          <Slider value={[edit.volume]} min={0} max={1.5} step={0.05} onValueChange={(v) => patch({ volume: v[0] ?? edit.volume })} />
        </Row>
        <Row label={`Trim ${formatTime(edit.trimStart)} – ${formatTime(trimEnd)}`}>
          <Slider
            value={[edit.trimStart, trimEnd]}
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            onValueChange={(v) => {
              const s = v[0] ?? 0;
              const e = v[1] ?? s + 0.5;
              patch({ trimStart: s, trimEnd: Math.max(e, s + 0.5) });
            }}
          />
        </Row>
        <p className="text-xs text-muted-foreground">Playhead {formatTime(time)} · new layers start here</p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export { defaultEdit };
