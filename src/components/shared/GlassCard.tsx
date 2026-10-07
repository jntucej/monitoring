"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlossyMotion, fadeInUp, cardHover } from "@/lib/animations";
import { motion, useMotionValue, useSpring, useTransform, Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGlass, GateStatus } from "@/context/GlassContext";

import { WordByWordText } from "./WordByWordText";
import { GlossyFloatingContainer } from "./GlossyFloatingContainer";

export interface GlassCardProps {
  id: string;
  title: string;
  subtitle: string;
  status: GateStatus;
  children?: React.ReactNode;
  className?: string;
  onDragEnd?: (id: string, newIndex: number) => void;
  index?: number;
  href?: string;
  onClick?: () => void;
}

export function GlassCard({
  id,
  title,
  subtitle,
  status,
  children,
  className,
  onDragEnd,
  index = 0,
  href,
  onClick,
}: GlassCardProps) {
  const router = useRouter();
  const { isDark, isTouchDevice, prefersReducedMotion, setActiveGate, activeGate, performanceTier, displayMode } = useGlass();
  const cardRef = useRef<HTMLDivElement>(null);
  const isGlossyMotion = useGlossyMotion();

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) onClick();
    else if (href) router.push(href);
  };

  // Critically damped springs for heavy industrial precision (or smooth easeOut on mobile/legacy)
  const getTransition = (): Transition => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile || performanceTier === "legacy") {
      return { duration: 0.2, ease: "easeOut" };
    }
    switch (performanceTier) {
      case "splusplus":
        return { type: "spring", stiffness: 220, damping: 32 };
      case "performance":
        return { type: "spring", stiffness: 150, damping: 30 };
      case "emergency":
        return { duration: 0 };
      default:
        return { duration: 0.2, ease: "easeOut" };
    }
  };

  const getBlurClass = () => {
    if (displayMode === "outdoor" || performanceTier === "emergency") {
      return "backdrop-blur-none";
    }
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

  const getContainerBackground = () => {
    if (displayMode === "outdoor" || performanceTier === "emergency") {
      return isDark ? "bg-slate-950/95 border-slate-700 text-white" : "bg-slate-100/95 border-slate-300 text-slate-900";
    }
    return isDark ? "bg-slate-900/60 border-white/10 text-slate-100" : "bg-white/80 border-white/80 text-neutral-900";
  };

  // 3D Tilt Motion Tracking with critically damped spring
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 220, damping: 32 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 32 });
  const rotateX = useTransform(smoothY, [-50, 50], [8, -8]);
  const rotateY = useTransform(smoothX, [-50, 50], [-8, 8]);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || prefersReducedMotion || displayMode === "outdoor" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set(((e.clientX - cx) / rect.width) * 100);
    y.set(((e.clientY - cy) / rect.height) * 100);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice && !prefersReducedMotion && displayMode !== "outdoor") {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const statusMap = {
    entry: { color: "emerald", text: "Granted", pulse: "bg-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/20", textCol: "text-emerald-300" },
    exit: { color: "rose", text: "Restricted", pulse: "bg-rose-500", border: "border-rose-500/30", bg: "bg-rose-500/20", textCol: "text-rose-300" },
    idle: { color: "slate", text: "Standby", pulse: "bg-slate-400", border: "border-slate-500/30", bg: "bg-slate-500/20", textCol: "text-slate-300" },
    warning: { color: "amber", text: "Alert", pulse: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/20", textCol: "text-amber-300" },
  };

  const current = statusMap[status];

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd(id, 0);
    }
  };

  const isActive = activeGate === id;
  const can3D = !isTouchDevice && !prefersReducedMotion && displayMode !== "outdoor";
  const shouldPulse = status === "warning" || status === "entry" || isActive;

  return (
    <motion.div
      ref={cardRef}
      initial={isGlossyMotion ? "hidden" : false}
      animate={isGlossyMotion ? "visible" : undefined}
      variants={fadeInUp}
      whileHover={isGlossyMotion && performanceTier !== "legacy" && performanceTier !== "emergency" ? cardHover : undefined}
      whileTap={isGlossyMotion && performanceTier !== "legacy" && performanceTier !== "emergency" ? { scale: 0.97 } : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: can3D && isGlossyMotion ? rotateX : 0,
        rotateY: can3D && isGlossyMotion ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      transition={getTransition()}
      drag={!isTouchDevice && performanceTier !== "emergency" && displayMode !== "outdoor"}
      dragConstraints={{ left: -60, right: 60, top: -60, bottom: 60 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onClick={href || onClick ? handleCardClick : undefined}
      className={cn(
        "relative w-full max-w-sm p-6 rounded-2xl border transition-colors duration-500 overflow-hidden shadow-xl",
        getContainerBackground(),
        getBlurClass(),
        isActive && "ring-2 ring-emerald-400/50",
        (href || onClick) ? "cursor-pointer hover:border-emerald-400/50 hover:shadow-emerald-500/10" : "",
        className
      )}
    >
      {/* SVG Micro-Noise Grain Overlay for Tactile Depth */}
      {displayMode !== "outdoor" && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.03] mix-blend-overlay overflow-hidden z-0">
          <svg className="w-full h-full">
            <filter id="noise-card">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise-card)" />
          </svg>
        </div>
      )}

      {/* Ambient Glow */}
      {displayMode !== "outdoor" && (
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl blur-3xl transition-opacity duration-700 pointer-events-none",
            status === "entry" ? "bg-emerald-500/30" : status === "exit" ? "bg-rose-500/30" : "bg-amber-500/20",
            isDark ? "opacity-40" : "opacity-20"
          )}
          style={{ zIndex: -1 }}
        />
      )}

      {/* Specular Highlight Gloss (Replaces Chromatic Aberration) */}
      {isHovered && !prefersReducedMotion && displayMode !== "outdoor" && (
        <div className="absolute -inset-[1px] rounded-2xl pointer-events-none z-0">
          <div className="w-full h-full rounded-2xl border border-white/30 bg-gradient-to-br from-white/15 via-transparent to-white/5" />
        </div>
      )}

      {/* Status Pulse Ring — Conditional (Active/Warning Only) */}
      {performanceTier !== "emergency" && (
        shouldPulse ? (
          <motion.div
            animate={
              prefersReducedMotion
                ? { opacity: 0.8 }
                : {
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0, 0.6],
                  }
            }
            transition={{
              duration: performanceTier === "splusplus" ? 2 : 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full blur-sm z-20", current.pulse)}
          />
        ) : (
          <div className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full opacity-60 z-20", current.pulse)} />
        )
      )}

      {/* Content Z-lift Layer with High Contrast Typography */}
      <div style={{ transform: can3D ? "translateZ(20px)" : "none", transformStyle: can3D ? "preserve-3d" : "flat" }} className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            <WordByWordText text={title} />
          </h3>
          <span className={cn("text-xs font-mono px-2.5 py-1 rounded-full border font-semibold", current.bg, current.textCol, current.border)}>
            {current.text}
          </span>
        </div>
        <p className={cn("text-sm mb-4 font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
          <WordByWordText text={subtitle} delay={0.05} />
        </p>
        {children}
        <button
          type="button"
          onClick={() => setActiveGate(isActive ? null : id)}
          className="mt-4 min-h-[44px] px-4 py-2.5 text-xs font-mono tracking-wider font-semibold text-slate-200 hover:text-white transition-colors backdrop-blur-sm rounded-xl border border-white/20 hover:border-white/40 bg-white/10 active:scale-95 flex items-center justify-center"
        >
          {isActive ? "Close Focus" : "Focus Gate"}
        </button>
      </div>
    </motion.div>
  );
}

export default GlassCard;
