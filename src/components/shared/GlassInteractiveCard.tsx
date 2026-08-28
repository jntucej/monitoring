"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassInteractiveCardProps {
  children: React.ReactNode;
  isDark?: boolean;
  className?: string;
  status?: "entry" | "exit" | "idle"; // Maps to Emerald / Rose status beacons
}

/**
 * 3D Tilt Glass Card with Holographic Cursor Refraction & Mobile Touch Protection.
 * Designed for GATE MONITOR operator desks & mobile inspection tablets.
 */
export function GlassInteractiveCard({
  children,
  isDark = true,
  className = "",
  status = "idle",
}: GlassInteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Motion values for 3D Tilt (GPU Composited)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring smoothing for 120fps tracking
  const smoothX = useSpring(x, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse percentage (-50 to 50) to rotation (-10deg to 10deg)
  const rotateX = useTransform(smoothY, [-50, 50], [8, -8]);
  const rotateY = useTransform(smoothX, [-50, 50], [-8, 8]);

  // Holographic Gloss Position (moves counter to tilt)
  const glossX = useTransform(smoothX, [-50, 50], ["30%", "70%"]);
  const glossY = useTransform(smoothY, [-50, 50], ["30%", "70%"]);

  // Mobile Touch Detection (disables 3D tilt on mobile touch devices)
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(((e.clientX - centerX) / rect.width) * 100);
    y.set(((e.clientY - centerY) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const statusGlowClass =
    status === "entry"
      ? "bg-emerald-500/30"
      : status === "exit"
      ? "bg-rose-500/30"
      : "bg-slate-500/15";

  const pulseDotClass =
    status === "entry" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isTouchDevice || shouldReduceMotion ? 0 : rotateX,
        rotateY: isTouchDevice || shouldReduceMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "relative w-full p-6 sm:p-8 rounded-3xl backdrop-blur-2xl border shadow-2xl transition-colors duration-700 overflow-hidden",
        isDark
          ? "bg-white/5 border-white/10 text-white"
          : "bg-white/60 border-white/80 text-neutral-900",
        className
      )}
    >
      {/* Ambient Glow (Behind Glass) */}
      <div
        className={cn(
          "absolute -inset-2 rounded-3xl blur-3xl transition-opacity duration-700 pointer-events-none",
          statusGlowClass,
          isDark ? "opacity-40" : "opacity-30"
        )}
        style={{ zIndex: -1 }}
      />

      {/* Holographic Gloss Overlay */}
      {!shouldReduceMotion && (
        <motion.div
          style={{
            background: `radial-gradient(circle at ${glossX} ${glossY}, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.03) 60%, transparent 80%)`,
          }}
          className="absolute inset-0 rounded-3xl pointer-events-none mix-blend-overlay"
        />
      )}

      {/* Border Light Leak Gloss */}
      {!shouldReduceMotion && (
        <motion.div
          style={{
            background: `radial-gradient(circle at ${glossX} ${glossY}, rgba(255,255,255,0.2) 0%, transparent 70%)`,
          }}
          className="absolute -inset-[1px] rounded-3xl pointer-events-none opacity-50"
        />
      )}

      {/* Main Content Layer (Lifted Z-Space) */}
      <div
        style={{
          transform: isTouchDevice || shouldReduceMotion ? "none" : "translateZ(18px)",
          transformStyle: "preserve-3d",
        }}
        className="relative z-10"
      >
        {children}
      </div>

      {/* Status Pulse Beacon Dot */}
      {status !== "idle" && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.8 }
              : {
                  scale: [1, 1.25, 1],
                  opacity: [0.6, 0.1, 0.6],
                }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "absolute bottom-4 right-4 w-3 h-3 rounded-full blur-[1px]",
            pulseDotClass
          )}
        />
      )}
    </motion.div>
  );
}

export default GlassInteractiveCard;
