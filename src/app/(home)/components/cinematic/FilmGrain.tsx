"use client";

import { usePerformanceTier } from "../hooks/usePerformanceTier";

/**
 * Full-viewport SVG noise overlay.
 * full    → 0.08 opacity
 * reduced → 0.05 opacity
 * static  → null (removes the SVG filter entirely, saves ~3ms/frame)
 */
export function FilmGrain() {
  const tier = usePerformanceTier();
  if (tier === "static") return null;

  const opacity = tier === "reduced" ? 0.05 : 0.08;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] mix-blend-overlay"
      style={{ opacity }}
    >
      <svg className="h-full w-full">
        <filter id="home-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#home-film-grain)" />
      </svg>
    </div>
  );
}
