"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export function BlurReveal({
  children,
  delay = 0,
  className = "",
  amount = 0.25,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number;
}) {
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const useBlur = tier === "full" && !reduced;

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: 16,
        ...(useBlur ? { filter: "blur(12px)" } : {}),
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        ...(useBlur ? { filter: "blur(0px)" } : {}),
      }}
      viewport={{ once: true, amount }}
      transition={{ ...SPRING_STORY, delay }}
    >
      {children}
    </motion.div>
  );
}
