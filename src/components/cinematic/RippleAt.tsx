"use client";

import { motion } from "framer-motion";

export function RippleAt({
  x,
  y,
  color,
  onDone,
}: {
  x: number;
  y: number;
  color: string;
  onDone: () => void;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        translateX: "-50%",
        translateY: "-50%",
        border: `1px solid ${color}`,
      }}
      initial={{ width: 8, height: 8, opacity: 0.65 }}
      animate={{ width: 280, height: 280, opacity: 0 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onDone}
    />
  );
}
