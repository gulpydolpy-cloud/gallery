import { useEffect, useMemo } from "react";

const DURATIONS: Record<string, number> = {
  rose_burst: 3200,
  diamond_sparkle: 4000,
  bonnie_blue_special: 3600,
  galaxy_explosion: 4200,
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function GiftEffectOverlay({ animationKey, onDone }: { animationKey: string; onDone: () => void }) {
  const duration = DURATIONS[animationKey] ?? 3000;
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {animationKey === "rose_burst" && <RosePetals />}
      {animationKey === "diamond_sparkle" && <DiamondSparkles />}
      {animationKey === "bonnie_blue_special" && <BonnieBlueBurst />}
      {animationKey === "galaxy_explosion" && <GalaxySpiral />}
    </div>
  );
}

function RosePetals() {
  const petals = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: rand(0, 100),
        delay: rand(0, 1.2),
        duration: rand(2.4, 3.6),
        size: rand(14, 26),
        drift: rand(-60, 60),
        rotate: rand(-180, 180),
      })),
    []
  );
  return (
    <>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-40px] block rounded-[60%_10%_60%_10%] bg-gradient-to-br from-rose-300 to-rose-600 opacity-60"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.8,
              animation: `gift-petal-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              "--drift": `${p.drift}px`,
              "--rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

function DiamondSparkles() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: rand(2, 98),
        top: rand(5, 95),
        delay: rand(0, 3.4),
        duration: rand(0.6, 1.1),
        size: rand(6, 16),
      })),
    []
  );
  return (
    <>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white shadow-[0_0_12px_4px_rgba(103,232,249,0.9)]"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `gift-sparkle-pop ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function BonnieBlueBurst() {
  const dots = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        angle: rand(0, 360),
        distance: rand(80, 340),
        delay: rand(0, 0.6),
        duration: rand(1.6, 2.8),
        size: rand(6, 14),
      })),
    []
  );
  return (
    <>
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute top-1/2 left-1/2 rounded-full bg-blue-400 shadow-[0_0_10px_3px_rgba(96,165,250,0.9)]"
          style={
            {
              width: d.size,
              height: d.size,
              animation: `gift-wild-burst ${d.duration}s ease-out ${d.delay}s forwards`,
              "--tx": `${Math.cos((d.angle * Math.PI) / 180) * d.distance}px`,
              "--ty": `${Math.sin((d.angle * Math.PI) / 180) * d.distance}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

function GalaxySpiral() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 60) * Math.PI * 8;
        const radius = (i / 60) * 130;
        return { id: i, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, size: rand(2, 5), hue: rand(230, 300) };
      }),
    []
  );
  return (
    <div
      className="absolute top-1/2 left-1/2 size-[280px]"
      style={{ animation: "gift-galaxy-spin 4.2s ease-in-out forwards" }}
    >
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `calc(50% + ${s.x}px)`,
            top: `calc(50% + ${s.y}px)`,
            width: s.size,
            height: s.size,
            background: `hsl(${s.hue} 90% 75%)`,
            boxShadow: `0 0 8px 2px hsl(${s.hue} 90% 65%)`,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_30px_10px_rgba(216,180,254,0.9)]" />
    </div>
  );
}
