"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { StaticHero } from "../webgl/Fallbacks/StaticHero";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export function GateBackdrop() {
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 28, mass: 1 });

  const y = useTransform(progress, [0, 1], [0, -180]);
  const scale = useTransform(progress, [0, 1], [1.08, 1.15]);

  if (tier === "static" || reduced) {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] opacity-[0.16]">
        <StaticHero accent="amber" />
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden
      style={{ y, scale }}
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.16]"
    >
      <StaticHero accent="amber" />
    </motion.div>
  );
}
