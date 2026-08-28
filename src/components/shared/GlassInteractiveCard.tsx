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
import { useGlass } from "@/context/GlassContext";

export interface GlassInteractiveCardProps {
  children: React.ReactNode;
  isDark?: boolean;
  className?: string;
  status?: "entry" | "exit" | "idle"; // Maps to Emerald / Rose status beacons
}

/**
 * 3D Tilt Glass Card with Holographic Cursor Refraction & Mobile Touch Protection.
 * Designed for GATE MONITOR operator desks & mobile inspection tablets.
 * Upgraded with industrial contrast, glove accessibility, specular highlights, and emergency mode protection.
 */
export function GlassInteractiveCard({
  children,
  isDark: propIsDark,
  className = "",
  status = "idle",
}: GlassInteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { isDark: contextIsDark, performanceTier, displayMode } = useGlass();

  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  // Motion values for 3D Tilt (GPU Composited)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Critically damped spring smoothing for 120fps tracking (220 stiffness, 32 damping)
  const smoothX = useSpring(x, { stiffness: 220, damping: 32 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 32 });

  // Map mouse percentage (-50 to 50) to rotation (-8deg to 8deg)
  const rotateX = useTransform(smoothY, [-50, 50], [8, -8]);
  const rotateY = useTransform(smoothX, [-50, 50], [-8, 8]);

  // Holographic Gloss Position
  const glossX = useTransform(smoothX, [-50, 50], ["30%", "70%"]);
  const glossY = useTransform(smoothY, [-50, 50], ["30%", "70%"]);

  // Mobile Touch Detection
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || shouldReduceMotion || displayMode === "outdoor" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(((e.clientX - centerX) / rect.width) * 100);
    y.set(((e.clientY - centerY) / rect.height) * 100);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice && !shouldReduceMotion && displayMode !== "outdoor") {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const statusGlowClass =
    status === "entry"
      ? "bg-emerald-500/30"
      : status === "exit"
      ? "bg-rose-500/30"
      : "bg-slate-500/15";

  const pulseDotClass = status === "entry" ? "bg-emerald-500" : "bg-rose-500";
  const isOutdoorOrEmergency = displayMode === "outdoor" || performanceTier === "emergency";
  const canTilt = !isTouchDevice && !shouldReduceMotion && !isOutdoorOrEmergency;

  const getContainerBackground = () => {
    if (isOutdoorOrEmergency) {
      return isDark ? "bg-slate-950/95 border-slate-700 text-white" : "bg-slate-100/95 border-slate-300 text-slate-900";
    }
    return isDark ? "bg-slate-900/60 border-white/10 text-slate-100" : "bg-white/80 border-white/80 text-neutral-900";
  };

  const getBlurClass = () => {
    if (isOutdoorOrEmergency) return "backdrop-blur-none";
    switch (performanceTier) {
      case "splusplus":
        return "backdrop-blur-2xl";
      case "performance":
        return "backdrop-blur-md";
      case "legacy":
        return "backdrop-blur-sm";
      default:
        return "backdrop-blur-2xl";
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: canTilt ? rotateX : 0,
        rotateY: canTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 220, damping: 32 }}
      className={cn(
        "relative w-full p-6 sm:p-8 rounded-3xl border shadow-2xl transition-colors duration-500 overflow-hidden",
        getContainerBackground(),
        getBlurClass(),
        className
      )}
    >
      {/* SVG Micro-Noise Grain Overlay for Tactile Texture */}
      {!isOutdoorOrEmergency && (
        <div className="absolute inset-0 rounded-3xl pointer-events-none opacity-[0.03] mix-blend-overlay overflow-hidden z-0">
          <svg className="w-full h-full">
            <filter id="noise-interactive">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise-interactive)" />
          </svg>
        </div>
      )}

      {/* Ambient Glow (Behind Glass) */}
      {!isOutdoorOrEmergency && (
        <div
          className={cn(
            "absolute -inset-2 rounded-3xl blur-3xl transition-opacity duration-700 pointer-events-none",
            statusGlowClass,
            isDark ? "opacity-40" : "opacity-30"
          )}
          style={{ zIndex: -1 }}
        />
      )}

      {/* Specular Highlight Gradient */}
      {isHovered && !isOutdoorOrEmergency && (
        <div className="absolute -inset-[1px] rounded-3xl pointer-events-none z-0">
          <div className="w-full h-full rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 via-transparent to-white/5" />
        </div>
      )}

      {/* Holographic Gloss Overlay */}
      {canTilt && (
        <motion.div
          style={{
            background: `radial-gradient(circle at ${glossX} ${glossY}, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.02) 60%, transparent 80%)`,
          }}
          className="absolute inset-0 rounded-3xl pointer-events-none mix-blend-overlay"
        />
      )}

      {/* Main Content Layer (Lifted Z-Space) */}
      <div
        style={{
          transform: canTilt ? "translateZ(18px)" : "none",
          transformStyle: "preserve-3d",
        }}
        className="relative z-10"
      >
        {children}
      </div>

      {/* Status Pulse Beacon Dot — Active only for non-idle */}
      {status !== "idle" && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={
            shouldReduceMotion || isOutdoorOrEmergency
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
            "absolute bottom-4 right-4 w-3 h-3 rounded-full blur-[1px] z-20",
            pulseDotClass
          )}
        />
      )}
    </motion.div>
  );
}

export default GlassInteractiveCard;
