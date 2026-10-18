"use client";

import { motion } from "framer-motion";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export function AmbientGlow() {
  const tier = usePerformanceTier();
  if (tier === "static") return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[4]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.18 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      style={{
        background:
          "radial-gradient(circle at var(--home-active-glow-x, 30%) var(--home-active-glow-y, 40%), var(--home-active-accent) 0%, transparent 55%)",
        filter: "blur(60px)",
      }}
    />
  );
}
