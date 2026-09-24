let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gainPeak = 0.15) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

function sweep(freqStart: number, freqEnd: number, start: number, duration: number, gainPeak = 0.12) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freqStart, ac.currentTime + start);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + start + duration);
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function playGiftSound(animationKey: string) {
  try {
    if (animationKey === "rose_burst") {
      tone(880, 0, 0.25, "sine", 0.18);
    } else if (animationKey === "diamond_sparkle") {
      [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.18, "triangle", 0.12));
    } else if (animationKey === "bonnie_blue_special") {
      sweep(300, 1200, 0, 0.5, 0.14);
      tone(600, 0.1, 0.3, "sine", 0.1);
    } else if (animationKey === "galaxy_explosion") {
      sweep(120, 900, 0, 0.9, 0.16);
      tone(60, 0, 0.6, "sine", 0.2);
      [660, 880, 990].forEach((f, i) => tone(f, 0.5 + i * 0.12, 0.4, "triangle", 0.1));
    }
  } catch {
    /* audio blocked by the browser's autoplay policy — visuals still show fine */
  }
}
