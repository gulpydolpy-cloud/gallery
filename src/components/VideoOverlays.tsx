import { isVisible, type Overlay, type VideoEdit } from "@/lib/edit";
import { useSignedUrl } from "@/lib/media";

/** Renders one overlay. Sizes use container query units so it looks identical at any player size. */
export function OverlayItem({ o, selected }: { o: Overlay; selected?: boolean }) {
  const { data: src } = useSignedUrl("media", o.kind === "text" ? null : o.path);
  const common: React.CSSProperties = {
    position: "absolute",
    left: `${o.x * 100}%`,
    top: `${o.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${o.rotation}deg)`,
    outline: selected ? "2px dashed rgba(255,255,255,.9)" : undefined,
    outlineOffset: 4,
  };

  if (o.kind === "text") {
    return (
      <div
        style={{
          ...common,
          maxWidth: "88%",
          fontFamily: o.font,
          color: o.color,
          fontSize: `${o.size}cqh`,
          lineHeight: 1.15,
          fontWeight: 800,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          padding: o.bg === "none" ? 0 : "0.25em 0.6em",
          borderRadius: "9999px",
          background: o.bg === "none" ? "transparent" : o.bg,
          textShadow: o.bg === "none" ? "0 2px 8px rgba(0,0,0,.45)" : undefined,
        }}
      >
        {o.text}
      </div>
    );
  }

  return (
    <div style={{ ...common, width: `${o.scale * 100}cqw` }}>
      {src ? <img src={src} alt="" draggable={false} className="w-full select-none" /> : <div className="aspect-square w-full rounded-lg bg-white/10" />}
    </div>
  );
}

/** Read-only overlay layer synced to the player's current time. */
export function VideoOverlays({ edit, time }: { edit: VideoEdit; time: number }) {
  if (!edit.overlays.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ containerType: "size" }}>
      {edit.overlays.filter((o) => isVisible(o, time)).map((o) => (
        <OverlayItem key={o.id} o={o} />
      ))}
    </div>
  );
}
