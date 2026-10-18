"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { SPRING_PARALLAX } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

/**
 * Fixed 2px top bar. Fill width driven by scroll progress.
 * Hidden entirely on reduced-motion / tier-static.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, SPRING_PARALLAX);
  const reduced = useReducedMotionSafe();

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[var(--z-header,50)] h-[2px] origin-left"
      style={{
        scaleX,
        background: "var(--home-accent-amber)",
      }}
    />
  );
}
