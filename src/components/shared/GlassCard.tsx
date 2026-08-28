"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGlass, GateStatus } from "@/context/GlassContext";

export interface GlassCardProps {
  id: string;
  title: string;
  subtitle: string;
  status: GateStatus;
  children?: React.ReactNode;
  className?: string;
  onDragEnd?: (id: string, newIndex: number) => void;
  index?: number;
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
}: GlassCardProps) {
  const { isDark, isTouchDevice, prefersReducedMotion, setActiveGate, activeGate, performanceTier } = useGlass();
  const cardRef = useRef<HTMLDivElement>(null);

  const getTransition = (): Transition => {
    switch (performanceTier) {
      case "splusplus":
        return { type: "spring", stiffness: 300, damping: 25 };
      case "performance":
        return { type: "spring", stiffness: 150, damping: 30 };
      case "legacy":
        return { duration: 0.2, ease: "easeOut" };
      case "emergency":
      default:
        return { duration: 0 };
    }
  };

  const getBlurClass = () => {
    switch (performanceTier) {
      case "splusplus":
        return "backdrop-blur-2xl";
      case "performance":
        return "backdrop-blur-md";
      case "legacy":
        return "backdrop-blur-sm";
      case "emergency":
        return "backdrop-blur-none";
      default:
        return "backdrop-blur-2xl";
    }
  };

  // 3D Tilt Motion Tracking
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(smoothY, [-50, 50], [8, -8]);
  const rotateY = useTransform(smoothX, [-50, 50], [-8, 8]);

  // Chromatic Aberration RGB split on hover
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set(((e.clientX - cx) / rect.width) * 100);
    y.set(((e.clientY - cy) / rect.height) * 100);
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
  const can3D = !isTouchDevice && !prefersReducedMotion;


  return (
    <motion.div
      ref={cardRef}
      layoutId={id}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      style={{
        rotateX: can3D ? rotateX : 0,
        rotateY: can3D ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      transition={getTransition()}
      drag={!isTouchDevice && performanceTier !== "emergency"}
      dragConstraints={{ left: -60, right: 60, top: -60, bottom: 60 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isTouchDevice ? 0.97 : 1 }}
      className={cn(
        "relative w-full max-w-sm p-6 rounded-2xl border transition-colors duration-500",
        isDark ? "bg-white/5 border-white/10 text-white" : "bg-white/60 border-white/80 text-neutral-900",
        getBlurClass(),
        isActive && "ring-2 ring-emerald-400/50",
        className
      )}
    >
      {/* Ambient Glow */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl blur-3xl transition-opacity duration-700 pointer-events-none",
          status === "entry" ? "bg-emerald-500/30" : status === "exit" ? "bg-rose-500/30" : "bg-amber-500/20",
          isDark ? "opacity-40" : "opacity-20"
        )}
        style={{ zIndex: -1 }}
      />

      {/* Chromatic Aberration RGB Border Split */}
      {isHovered && !prefersReducedMotion && (
        <>
          <motion.div
            style={{
              x: useTransform(smoothX, [-50, 50], [-2, 2]),
              y: useTransform(smoothY, [-50, 50], [-2, 2]),
            }}
            className="absolute -inset-[1px] rounded-2xl pointer-events-none border border-emerald-400/40"
          />
          <motion.div
            style={{
              x: useTransform(smoothX, [-50, 50], [2, -2]),
              y: useTransform(smoothY, [-50, 50], [2, -2]),
            }}
            className="absolute -inset-[1px] rounded-2xl pointer-events-none border border-rose-400/40"
          />
        </>
      )}

      {/* Status Pulse Ring */}
      {performanceTier !== "emergency" && (
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
          className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full blur-sm", current.pulse)}
        />
      )}

      {/* Content Z-lift Layer */}
      <div style={{ transform: can3D ? "translateZ(20px)" : "none", transformStyle: "preserve-3d" }} className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <span className={cn("text-xs font-mono px-2 py-1 rounded-full border", current.bg, current.textCol, current.border)}>
            {current.text}
          </span>
        </div>
        <p className="text-sm text-neutral-400 mb-4">{subtitle}</p>
        {children}
        <button
          type="button"
          onClick={() => setActiveGate(isActive ? null : id)}
          className="mt-4 text-xs font-mono tracking-wider text-neutral-400 hover:text-white transition-colors backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 hover:border-white/30"
        >
          {isActive ? "Close Focus" : "Focus Gate"}
        </button>
      </div>
    </motion.div>
  );
}

export default GlassCard;
