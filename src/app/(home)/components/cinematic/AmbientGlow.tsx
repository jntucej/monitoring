"use client";

import { motion } from "framer-motion";

export type HomeAccent = "amber" | "indigo" | "steel" | "crimson" | "navy";

export interface AmbientGlowProps {
  accent?: HomeAccent;
  className?: string;
  /** 0–1. Base glow opacity. */
  intensity?: number;
}

const ACCENT_VAR: Record<HomeAccent, string> = {
  amber: "--home-accent-amber",
  indigo: "--home-accent-indigo",
  steel: "--home-accent-steel",
  crimson: "--home-accent-crimson",
  navy: "--home-accent-navy",
};

/**
 * Soft radial glow blob. Positioned via the className prop
 * (e.g. "top-1/4 left-1/4 w-1/2 h-1/2"). Accent drives the color.
 */
export function AmbientGlow({
  accent = "amber",
  className = "",
  intensity = 0.18,
}: AmbientGlowProps) {
  const color = `var(${ACCENT_VAR[accent]})`;

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: intensity }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      style={{
        background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
      }}
    />
  );
}
