"use client";

import { motion } from "framer-motion";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface BreathingVignetteProps {
  /** 0–1. Multiplies the base opacity. Use 0.6–1.0. */
  intensity?: number;
}

/**
 * Radial vignette that slowly pulses opacity in a 6s loop.
 * full    → animated pulse
 * reduced → static opacity
 * static  → null (removed entirely)
 */
export function BreathingVignette({ intensity = 1 }: BreathingVignetteProps) {
  const tier = usePerformanceTier();
  const reduced = useReducedMotionSafe();

  if (tier === "static") return null;

  const baseOpacity = Math.max(0, Math.min(1, 0.6 * intensity));
  const peakOpacity = Math.max(0, Math.min(1, 0.8 * intensity));
  const background =
    "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)";

  if (reduced) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[5]"
        style={{ background, opacity: baseOpacity }}
      />
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5]"
      style={{ background }}
      animate={{ opacity: [baseOpacity, peakOpacity, baseOpacity] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
