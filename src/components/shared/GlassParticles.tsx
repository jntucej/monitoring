"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useGlass } from "@/context/GlassContext";

export interface GlassParticlesProps {
  count?: number;
  isDark?: boolean;
  className?: string;
  speed?: number;
  intensity?: number;
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
  const { performanceTier, isTouchDevice, displayMode, gateTraffic } = useGlass();
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const particleY = useTransform(scrollY, [0, 1000], [0, -150]);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; duration: number; delay: number; size: number }>
  >([]);

  useEffect(() => {
    setMounted(true);
    if (performanceTier === "emergency" || performanceTier === "legacy") {
      setParticles([]);
      return;
    }

    // Particle count: 0 on emergency/legacy, 4 on performance, 12-40 on splusplus
    const finalCount =
      performanceTier === "performance"
        ? 6
        : isTouchDevice
        ? 12
        : Math.min(Math.max(defaultCount, 15), 40);

    const generated = Array.from({ length: finalCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 6,
      size: Math.random() * 4 + 2,
    }));
    setParticles(generated);
  }, [defaultCount, isTouchDevice, performanceTier]);

  if (
    shouldReduceMotion ||
    displayMode === "outdoor" ||
    performanceTier === "emergency" ||
    performanceTier === "legacy" ||
    !mounted ||
    particles.length === 0
  ) return null;

  // Neutral floating shards — NEVER use Emerald (#10b981) or Rose (#f43f5e) in ambient backgrounds!
  const colorClass = isDark ? "bg-white/10" : "bg-slate-400/10";

  // Speed multiplier derived from live gate traffic (faster breathing at high traffic)
  const speedMultiplier = Math.max(0.4, Math.min(2.5, gateTraffic / 40));

  return (
    <motion.div
      aria-hidden="true"
      style={{ y: particleY }}
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${colorClass} backdrop-blur-sm`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
          animate={{
            y: [0, -60, 60, 0],
            x: [0, 30, -30, 0],
            scale: [0, 1.8, 0.4, 0],
            opacity: [0, 0.5, 0.2, 0],
          }}
          transition={{
            duration: p.duration / speedMultiplier,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </motion.div>
  );
}

export default GlassParticles;

