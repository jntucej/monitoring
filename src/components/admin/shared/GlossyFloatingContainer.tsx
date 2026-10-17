"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";
import { useGlass } from "@/context/GlassContext";
import { glossyFloatAnimation } from "@/lib/animations";
import { cn } from "@/lib/utils";

export interface GlossyFloatingContainerProps {
  children: React.ReactNode;
  className?: string;
  floatDelay?: number;
  floatDistance?: number;
  enableFloat?: boolean;
}

export function GlossyFloatingContainer({
  children,
  className = "",
  floatDelay = 0,
  floatDistance = -7,
  enableFloat = true,
}: GlossyFloatingContainerProps) {
  const theme = useUIStore((s) => s.theme);
  const { prefersReducedMotion, performanceTier, isTouchDevice, displayMode } = useGlass();

  const isGlossy = theme === "glass";
  const isMobileOrLowFps =
    isTouchDevice ||
    performanceTier === "legacy" ||
    performanceTier === "emergency" ||
    performanceTier === "low" ||
    displayMode === "outdoor" ||
    prefersReducedMotion;

  const shouldFloat = isGlossy && enableFloat && !isMobileOrLowFps;

  return (
    <motion.div
      animate={
        shouldFloat
          ? {
              y: [0, floatDistance, 0],
            }
          : { y: 0 }
      }
      transition={
        shouldFloat
          ? {
              duration: 5 + floatDelay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: floatDelay,
            }
          : { duration: 0.2 }
      }
      className={cn(
        "relative transition-all duration-300",
        isGlossy && "glass-floating-surface",
        className
      )}
    >
      {/* Specular Ambient Glow Aura when in Glossy mode */}
      {isGlossy && !isMobileOrLowFps && (
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 blur-xl opacity-40 -z-10 pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
}

export default GlossyFloatingContainer;
