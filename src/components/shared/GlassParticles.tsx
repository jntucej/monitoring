"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGlass } from "@/context/GlassContext";

export interface GlassParticlesProps {
  count?: number;
  isDark?: boolean;
  className?: string;
}

/**
  * Ambient GPU-accelerated floating glass shard particle stream.
  * Gracefully degrades on mobile, outdoor mode, or when reduced motion is preferred or performance tier is legacy/emergency.
  * Uses neutral tone particles exclusively (Emerald/Rose are strictly reserved for operational status beacons).
  */
export function GlassParticles({
  count: defaultCount = 12,
  isDark = true,
  className = "",
}: GlassParticlesProps) {
  const shouldReduceMotion = useReducedMotion();
  const { performanceTier, isTouchDevice, displayMode } = useGlass();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; duration: number; delay: number }>
  >([]);

  useEffect(() => {
    setMounted(true);
    const finalCount = performanceTier === "performance" ? 4 : isTouchDevice ? 8 : defaultCount;

    const generated = Array.from({ length: finalCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
    }));
    setParticles(generated);
  }, [defaultCount, isTouchDevice, performanceTier]);

  if (
    shouldReduceMotion ||
    displayMode === "outdoor" ||
    performanceTier === "emergency" ||
    performanceTier === "legacy" ||
    !mounted
  ) return null;

  // Neutral floating shards — NEVER use Emerald (#10b981) or Rose (#f43f5e) in ambient backgrounds!
  const colorClass = isDark ? "bg-white/10" : "bg-slate-400/15";

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute w-1.5 h-1.5 rounded-full ${colorClass} backdrop-blur-sm`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -60, 60, 0],
            x: [0, 30, -30, 0],
            scale: [0, 1.8, 0.4, 0],
            opacity: [0, 0.5, 0.2, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export default GlassParticles;
