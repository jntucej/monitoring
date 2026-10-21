"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { DRAG_TRANSITION, SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export function PhysicsCard({
  children,
  className = "",
  dragRange = 24,
}: {
  children: ReactNode;
  className?: string;
  dragRange?: number;
}) {
  const reduced = useReducedMotionSafe();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      drag
      dragConstraints={{ left: -dragRange, right: dragRange, top: -dragRange, bottom: dragRange }}
      dragElastic={0.18}
      dragTransition={DRAG_TRANSITION}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      whileHover={{ scale: 1.005 }}
      transition={SPRING_STORY}
      style={{ touchAction: "none" }}
    >
      {children}
    </motion.div>
  );
}
