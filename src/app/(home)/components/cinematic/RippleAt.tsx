"use client";

import { motion } from "framer-motion";

export interface RippleAtProps {
  x: number;
  y: number;
  color?: string;
  onDone: () => void;
}

/**
 * A single expanding ripple at a screen-space (x, y) coordinate.
 * Used by PerspectiveSelector and LoginGateway on click/tap.
 * Fires onDone after the animation so the parent can drop the id.
 */
export function RippleAt({
  x,
  y,
  color = "var(--home-accent-amber)",
  onDone,
}: RippleAtProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed rounded-full"
      style={{
        left: x,
        top: y,
        width: 24,
        height: 24,
        marginLeft: -12,
        marginTop: -12,
        background: color,
      }}
      initial={{ scale: 0, opacity: 0.65 }}
      animate={{ scale: 12, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={onDone}
    />
  );
}
