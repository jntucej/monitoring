"use client";

import { type ReactNode } from "react";

/**
 * HomeRoot — the single wrapper for everything inside / (home page).
 *
 * Owns `data-home` on the root. The marketing landing keeps its dark
 * Archway palette (scoped to [data-home] in globals.css).
 * Performance pass: no glossy background layer, no theme crossfade,
 * no device-tier detection.
 */
export function HomeRoot({ children }: { children: ReactNode }) {
  return (
    <div data-home="" className="home-root min-h-dvh">
      {children}
    </div>
  );
}
