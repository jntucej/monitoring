"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface MoonGlowProps {
  stars?: number;
}

/**
 * Moon + scattered stars overlay. Navy only — mounted exclusively
 * inside "The Quiet" chapter. Fades in over 3s.
 */
export function MoonGlow({ stars = 40 }: MoonGlowProps) {
  const reduced = useReducedMotionSafe();

  const starField = useMemo(
    () =>
      Array.from({ length: stars }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 70,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
      })),
    [stars]
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[7]"
    >
      {/* Moon */}
      <motion.div
        className="absolute right-[12%] top-[15%] rounded-full"
        style={{
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle at 35% 35%, #E5E7EB 0%, #94A3B8 60%, #475569 100%)",
          boxShadow:
            "0 0 80px rgba(203,213,225,0.4), 0 0 160px rgba(148,163,184,0.2)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      {/* Stars — animated on full, static on reduced */}
      {starField.map((s) => {
        if (reduced) {
          return (
            <div
              key={s.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                opacity: 0.6,
              }}
            />
          );
        }

        return (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
            }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              delay: s.delay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
