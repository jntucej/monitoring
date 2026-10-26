"use client";

import { useReducedMotion } from "framer-motion";
import type { HomeDeviceTier } from "./homeDeviceTier";

/**
 * HomeGlossyBackground — the fixed ambient background that gives the home
 * page its gloss.
 *
 * HARD RULES honoured here:
 *   - Exactly ONE ambient blob (A). Three semantic-coloured blobs (mint/rose/
 *     gold) were dropped: additively they muddied to brown and fought the
 *     headline. The single blob is an institutional teal at low opacity.
 *   - The radial-gradient fades to the SAME colour at 0 alpha. Never the
 *     `transparent` keyword (that would produce transparent-black on dark
 *     bases and muddy the blend).
 *   - Animate `transform: translate3d()` only — never the gradient itself,
 *     never the blur radius.
 *   - NO `backdrop-filter` in this component. The hero paints on a
 *     zero-blur surface for LCP.
 *   - High tier only: static film-grain overlay (SVG feTurbulence data-URI,
 *     ~2% opacity) to cure 8-bit gradient banding. Not animated.
 *   - The whole tree is aria-hidden and pointer-events-none.
 */
export function HomeGlossyBackground({ tier }: { tier: HomeDeviceTier }) {
  const reduced = useReducedMotion();
  // Reduced motion => no animation. We keep the blobs rendered (as a
  // static ambient wash) so the page is not a stark flat surface; the
  // CSS tier rules already kill animation when `data-home-tier="low"`.
  const showGrain = tier === "high" && !reduced;

  return (
    <div
      aria-hidden="true"
      className="home-bg fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: -10 }}
    >
      {/* Layer 0: solid base — the theme's base surface. No gradient here. */}
      <div className="home-bg-base" />

      {/* Layer 1: one drifting ambient blob. Its keyframe loop (60s) animates
          ONLY translate3d(). */}
      <div className="home-blob home-blob-a" />

      {/* Layer 1.5: static film grain (high tier only). No animation. */}
      {showGrain && <div className="home-grain-overlay" />}
    </div>
  );
}
