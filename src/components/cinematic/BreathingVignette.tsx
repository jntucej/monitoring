"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION } from "./motion-presets";

export function BreathingVignette({ glow = "rgba(139,92,246,0.14)" }: { glow?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      animate={reduce ? undefined : { opacity: [0.7, 1, 0.7] }}
      transition={{ duration: DURATION.breath, repeat: Infinity, ease: "easeInOut" }}
      style={{
        background: `radial-gradient(circle at 50% 28%, ${glow}, transparent 62%)`,
      }}
    />
  );
}
