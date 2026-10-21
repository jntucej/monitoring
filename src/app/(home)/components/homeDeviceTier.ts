/**
 * homeDeviceTier — static, cheap device tier detection for the home page.
 *
 * No FPS probe, no ResizeObserver, no rAF sampling. A one-shot read of
 * matchMedia + hardware heuristics. Called exactly once inside HomeRoot and
 * written to data-home-tier on the root element; CSS reads it for tier-
 * scoped overrides.
 *
 * - "low"  when ANY of: prefers-reduced-motion, deviceMemory<=4, cores<=4,
 *                     coarse pointer + innerWidth<768
 * - "mid"  when deviceMemory<=8
 * - "high" otherwise
 *
 * Every browser API access is guarded so the helper is safe on the server
 * (returns "high" — the most-optimised tier; on SSR we render server HTML
 * with the high tier's CSS which is inert).
 */

export type HomeDeviceTier = "low" | "mid" | "high";

export function detectHomeDeviceTier(): HomeDeviceTier {
  if (typeof window === "undefined") return "high";

  let reducedMotion = false;
  try {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    /* matchMedia missing — treat as not reduced */
  }

  let deviceMemory = 8;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === "number") deviceMemory = nav.deviceMemory;

  const cores = typeof navigator.hardwareConcurrency === "number"
    ? navigator.hardwareConcurrency
    : 8;

  let coarse = false;
  let width = 1024;
  try {
    coarse = window.matchMedia("(pointer: coarse)").matches;
    width = window.innerWidth;
  } catch {
    /* leave defaults */
  }

  if (reducedMotion) return "low";
  if (deviceMemory <= 4) return "low";
  if (cores <= 4) return "low";
  if (coarse && width < 768) return "low";
  if (deviceMemory <= 8) return "mid";
  return "high";
}
