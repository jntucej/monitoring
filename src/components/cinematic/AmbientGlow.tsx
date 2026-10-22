"use client";

import { motion } from "framer-motion";
import { DURATION, EASE } from "./motion-presets";

interface AmbientGlowProps {
  color?: string;
  className?: string;
}

export function AmbientGlow({
  color = "rgba(139,92,246,0.18)",
  className = "",
}: AmbientGlowProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.page, ease: EASE.gentle }}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${color}, transparent 60%)`,
      }}
    />
  );
}
