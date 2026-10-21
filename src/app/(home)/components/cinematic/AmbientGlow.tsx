"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export function AmbientGlow() {
  const tier = usePerformanceTier();
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 70, damping: 28, mass: 1 });

  const y = useTransform(progress, [0, 1], [0, -120]);

  if (tier === "static" || reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[4] opacity-[0.18]"
        style={{
          background:
            "radial-gradient(circle at var(--home-active-glow-x, 30%) var(--home-active-glow-y, 40%), var(--home-active-accent) 0%, transparent 55%)",
          filter: "blur(60px)",
        }}
      />
    );
  }

  return (
    <motion.div
      aria-hidden
      style={{ y }}
      className="pointer-events-none fixed inset-0 z-[4] opacity-[0.18]"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at var(--home-active-glow-x, 30%) var(--home-active-glow-y, 40%), var(--home-active-accent) 0%, transparent 55%)",
          filter: "blur(60px)",
        }}
      />
    </motion.div>
  );
}
