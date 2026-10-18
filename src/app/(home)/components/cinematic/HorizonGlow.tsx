"use client";

import { motion } from "framer-motion";
import type { HomeAccent } from "./AmbientGlow";

export interface HorizonGlowProps {
  accent?: HomeAccent;
}

const ACCENT_VAR: Record<HomeAccent, string> = {
  amber: "--home-accent-amber",
  indigo: "--home-accent-indigo",
  steel: "--home-accent-steel",
  crimson: "--home-accent-crimson",
  navy: "--home-accent-navy",
};

/**
 * Light spill rising from the bottom of the viewport.
 * Used only in "leave" (warm sunrise) and "quiet" (moonlight).
 */
export function HorizonGlow({ accent = "amber" }: HorizonGlowProps) {
  const color = `var(${ACCENT_VAR[accent]})`;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[6] h-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      style={{
        background: `linear-gradient(to top, ${color}22 0%, transparent 100%)`,
      }}
    />
  );
}
