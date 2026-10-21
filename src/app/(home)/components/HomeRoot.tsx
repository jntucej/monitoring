"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { detectHomeDeviceTier, type HomeDeviceTier } from "./homeDeviceTier";
import { HomeGlossyBackground } from "./HomeGlossyBackground";
import { ThemeCrossfade } from "./ThemeCrossfade";

/**
 * HomeRoot — the single wrapper for everything inside / (home page).
 *
 * Owns:
 *   1. `data-home` + `data-home-tier` on the root (tier is static).
 *   2. Pointer interaction tracking: `data-home-interacting="true"` while a
 *      pointer is pressed anywhere inside. CSS pauses the blob drift during
 *      interaction so the user's scroll/pan gesture is never fighting the
 *      background.
 *   3. Renders the fixed glossy background + children + a theme crossfade
 *      overlay.
 */
export function HomeRoot({ children }: { children: ReactNode }) {
  // SSR + first client render both use "high" (the rich tier) so the
  // server HTML and the first client hydration agree. The real tier is
  // refined on mount, which cannot produce a hydration mismatch.
  const [tier, setTier] = useState<HomeDeviceTier>("high");
  const [interacting, setInteracting] = useState(false);
  const tierSet = useRef(false);

  useEffect(() => {
    if (tierSet.current) return;
    tierSet.current = true;
    setTier(detectHomeDeviceTier());
  }, []);

  // Track any pointer press on the root; release on up / cancel / blur.
  const pressCount = useRef(0);
  useEffect(() => {
    const root = document;
    const down = () => {
      pressCount.current += 1;
      if (pressCount.current > 0) setInteracting(true);
    };
    const up = () => {
      pressCount.current -= 1;
      if (pressCount.current <= 0) {
        pressCount.current = 0;
        setInteracting(false);
      }
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("blur", up);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("blur", up);
    };
  }, []);

  return (
    <div
      data-home=""
      data-home-tier={tier}
      data-home-interacting={interacting ? "true" : undefined}
      className="home-root min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]"
    >
      <HomeGlossyBackground tier={tier} />
      {children}
      <ThemeCrossfade />
    </div>
  );
}
