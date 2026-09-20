export type OverlayKind = "text" | "image" | "sticker";

export type Overlay = {
  id: string;
  kind: OverlayKind;
  /** text content */
  text: string;
  font: string;
  color: string;
  /** pill background, "none" for no pill */
  bg: string;
  /** font size in container-height units */
  size: number;
  /** storage path in the "media" bucket for image/sticker overlays */
  path: string | null;
  /** width as a fraction of the canvas width (image/sticker) */
  scale: number;
  rotation: number;
  /** centre position, 0..1 of canvas */
  x: number;
  y: number;
  /** visible window, in seconds */
  start: number;
  end: number;
};

export type VideoEdit = {
  overlays: Overlay[];
  /** playback rate, 0.5 – 2 */
  speed: number;
  /** 0 – 1.5 */
  volume: number;
};

export const EDITOR_FONTS = [
  { label: "Clean", value: "Manrope, system-ui, sans-serif" },
  { label: "Classic", value: "Georgia, 'Times New Roman', serif" },
  { label: "Typewriter", value: "'Courier New', ui-monospace, monospace" },
  { label: "Impact", value: "Impact, 'Arial Black', sans-serif" },
] as const;

export const EDITOR_COLORS = ["#ffffff", "#000000", "#ff2d55", "#ffd60a", "#34c759", "#0a84ff", "#bf5af2"] as const;

export const defaultEdit = (): VideoEdit => ({ overlays: [], speed: 1, volume: 1 });

export function parseEdit(value: unknown): VideoEdit {
  const base = defaultEdit();
  if (!value || typeof value !== "object") return base;
  const v = value as Partial<VideoEdit>;
  return {
    overlays: Array.isArray(v.overlays) ? (v.overlays.filter(Boolean) as Overlay[]) : [],
    speed: typeof v.speed === "number" && v.speed >= 0.25 && v.speed <= 4 ? v.speed : 1,
    volume: typeof v.volume === "number" && v.volume >= 0 && v.volume <= 1.5 ? v.volume : 1,
  };
}

export function newTextOverlay(duration: number, at = 0): Overlay {
  return {
    id: crypto.randomUUID(),
    kind: "text",
    text: "Tap to edit",
    font: EDITOR_FONTS[0].value,
    color: "#ffffff",
    bg: "none",
    size: 7,
    path: null,
    scale: 0.4,
    rotation: 0,
    x: 0.5,
    y: 0.35,
    start: at,
    end: Math.min(duration || 5, at + 5) || 5,
  };
}

export function newMediaOverlay(kind: "image" | "sticker", path: string, duration: number, at = 0): Overlay {
  return {
    ...newTextOverlay(duration, at),
    id: crypto.randomUUID(),
    kind,
    text: "",
    path,
    scale: 0.35,
    y: 0.5,
  };
}

export function isVisible(o: Overlay, t: number) {
  return t >= o.start - 0.001 && t <= o.end + 0.001;
}

export function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
