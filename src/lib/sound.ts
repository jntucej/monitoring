/**
 * Web Audio API Sound Synthesizer for Gate Operator Desk
 *
 * ponytail: one shared AudioContext, lazily created. Browsers cap concurrent
 * contexts (~6) — a fresh `new AudioContext()` per beep goes silent after a
 * few scans. Shared ctx also survives suspend/resume across gestures.
 */
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  // Contexts created before a user gesture start suspended; resume on use.
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export function playAudioFeedback(type: "success" | "warning" | "error"): void {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === "success") {
      // High bright two-tone chime (G5 -> C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, now); // G5
      osc1.frequency.setValueAtTime(1046.5, now + 0.08); // C6
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);
    } else if (type === "warning") {
      // Dual amber pulse (E5 -> E5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "error") {
      // Low buzz error tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(146.83, now + 0.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // ignore audio Context restrictions
  }
}