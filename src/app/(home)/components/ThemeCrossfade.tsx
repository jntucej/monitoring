"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * ThemeCrossfade — on a theme switch, paints a full-cover overlay with the
 * PREVIOUS theme's base background colour and fades it out over 400ms.
 *
 * Guards:
 *   - Only active inside [data-home] (home page). No-op elsewhere.
 *   - Skipped entirely under `prefers-reduced-motion: reduce`.
 *
 * The overlay fades via a CSS opacity transition (no framer-motion) so a
 * theme change cannot add a main-thread task to the home page.
 */
const THEME_BASE: Record<"dark" | "light" | "glass", string> = {
  dark: "#0A1128",    /* --bg-flat (dark) */
  light: "#f8fafc",   /* --bg-flat (light) */
  glass: "#0A1128",   /* glass base is a 60% tint of the dark bg-flat */
};

type ThemeName = "dark" | "light" | "glass";

export function ThemeCrossfade() {
  const theme = useUIStore((s) => s.theme) as ThemeName;
  const prevRef = useRef<ThemeName | null>(null);
  const [fadeFrom, setFadeFrom] = useState<ThemeName | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      prevRef.current = theme;
      return;
    }
    // A real switch: capture the theme we are leaving and trigger the fade.
    setFadeFrom(prevRef.current ?? theme);
    prevRef.current = theme;
  }, [theme]);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  if (!fadeFrom || reduced) return null;
  return (
    <CrossfadeOverlay
      key={fadeFrom}
      baseColor={THEME_BASE[fadeFrom]}
      onDone={() => setFadeFrom(null)}
    />
  );
}

/**
 * The overlay div: starts at opacity 1 and transitions to 0 over 400ms via
 * a CSS opacity transition. A 600ms safety-net timer guarantees `onDone`
 * fires even if the transition never completes (e.g. a mid-fade theme flip
 * re-mounts the overlay before `transitionend` fires).
 */
function CrossfadeOverlay({
  baseColor,
  onDone,
}: {
  baseColor: string;
  onDone: () => void;
}) {
  const [fading, setFading] = useState(false);

  // Trigger the opacity transition on the very next frame after mount so
  // the browser has painted the overlay at opacity 1 first.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFading(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Safety net: clear the overlay after 600ms no matter what.
  useEffect(() => {
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      className="home-crossfade fixed inset-0 pointer-events-none"
      style={{
        backgroundColor: baseColor,
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: "opacity 400ms ease-out",
      }}
    />
  );
}
