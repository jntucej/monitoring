"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";

/**
 * ThemeCrossfade — on a theme switch, paints a full-cover overlay with the
 * PREVIOUS theme's base background colour and fades it out over 400ms.
 *
 * Guards:
 *   - Only active inside [data-home] (home page). No-op elsewhere.
 *   - Skipped entirely under `prefers-reduced-motion: reduce`.
 *
 * The overlay fades via opacity only (transform-safe, no layout shift).
 */
const THEME_BASE: Record<"dark" | "light" | "glass", string> = {
  dark: "#0a0d13",
  light: "#eef1f5",
  glass: "#edf4fe",
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
    // A real switch: capture the theme we're leaving and trigger the fade.
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
    <AnimatePresence>
      <motion.div
        key={fadeFrom}
        aria-hidden="true"
        className="home-crossfade fixed inset-0 pointer-events-none"
        style={{ backgroundColor: THEME_BASE[fadeFrom], zIndex: 100 }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onAnimationComplete={() => setFadeFrom(null)}
      />
      <CrossfadeTimeout fadeFrom={fadeFrom} onTimeout={() => setFadeFrom(null)} />
    </AnimatePresence>
  );
}

/**
 * Safety net: even if the exit animation never calls onAnimationComplete
 * (framer-motion re-render race, a superseded theme change, or a reduced-
 * motion flip mid-fade), the overlay is force-cleared after 600ms so it
 * can never sit on top of the page and make it look "frozen".
 */
function CrossfadeTimeout({
  fadeFrom,
  onTimeout,
}: {
  fadeFrom: ThemeName;
  onTimeout: () => void;
}) {
  // Stable ref so the 600ms timer only re-arms when the fade actually
  // changes (fadeFrom), not on every parent re-render from a new inline
  // onTimeout closure.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });
  useEffect(() => {
    const t = setTimeout(() => onTimeoutRef.current(), 600);
    return () => clearTimeout(t);
  }, [fadeFrom]);
  return null;
}
