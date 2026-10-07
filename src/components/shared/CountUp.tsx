"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useGlass } from "@/context/GlassContext";
import { useUIStore } from "@/stores/uiStore";

export interface CountUpProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  startValue?: number;
  isLoading?: boolean;
}

export function SineWaveLoader({ className = "" }: { className?: string }) {
  const { prefersReducedMotion } = useGlass();

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center gap-2.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-mono text-xs shadow-[0_0_18px_rgba(6,182,212,0.3)] backdrop-blur-md select-none ${className}`}
    >
      {/* Dynamic Animated Sine Wave SVG */}
      <svg className="w-10 h-3.5 shrink-0 overflow-visible" viewBox="0 0 100 24" fill="none">
        <defs>
          <linearGradient id="sine-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 0 12 Q 12.5 2, 25 12 T 50 12 T 75 12 T 100 12"
          stroke="url(#sine-wave-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={
            prefersReducedMotion
              ? {}
              : {
                  d: [
                    "M 0 12 Q 12.5 2, 25 12 T 50 12 T 75 12 T 100 12",
                    "M 0 12 Q 12.5 22, 25 12 T 50 12 T 75 12 T 100 12",
                    "M 0 12 Q 12.5 2, 25 12 T 50 12 T 75 12 T 100 12",
                  ],
                }
          }
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>

      {/* Noticeable Oscillating Sine Text */}
      <motion.span
        animate={
          prefersReducedMotion
            ? { opacity: 0.8 }
            : {
                opacity: [0.7, 1, 0.7],
                y: [0, -2, 0, 2, 0],
              }
        }
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="font-black text-[11px] uppercase tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
      >
        FETCHING LIVE TELEMETRY…
      </motion.span>
    </motion.span>
  );
}

export function CountUp({
  value,
  duration = 0.8,
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
  startValue = 0,
  isLoading: propIsLoading,
}: CountUpProps) {
  const theme = useUIStore((s) => s.theme);
  const { prefersReducedMotion, performanceTier, isTouchDevice, isLiveLoading } = useGlass();
  const [mounted, setMounted] = useState(false);
  const prevThemeRef = useRef(theme);

  const isLoading = propIsLoading !== undefined ? propIsLoading : isLiveLoading;

  const isMobileOrLowFps =
    isTouchDevice ||
    performanceTier === "legacy" ||
    performanceTier === "emergency" ||
    performanceTier === "low" ||
    prefersReducedMotion;

  // Cinematic spring tuning for Glossy theme numerical rollout
  const spring = useSpring(startValue, {
    damping: isMobileOrLowFps ? 30 : 22,
    stiffness: isMobileOrLowFps ? 150 : 85,
  });

  useEffect(() => {
    setMounted(true);

    if (prevThemeRef.current !== theme) {
      // Re-trigger fresh count-up animation from 0 on theme switch
      spring.set(0);
      prevThemeRef.current = theme;
    }

    if (!isLoading && typeof value === "number") {
      const timer = setTimeout(() => {
        spring.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [value, delay, spring, theme, isLoading]);

  const display = useTransform(spring, (v) => {
    const formatted = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

  // Noticeable Sine Wave Telemetry Loading State
  if (isLoading) {
    return <SineWaveLoader className={className} />;
  }

  if (!mounted || isMobileOrLowFps) {
    // Fast static fallback render for SSR and low-end mobile devices
    const formattedFallback = decimals > 0 ? value.toFixed(decimals) : value.toLocaleString();
    return (
      <span className={className}>
        {prefix}
        {formattedFallback}
        {suffix}
      </span>
    );
  }

  return <motion.span className={className}>{display}</motion.span>;
}

export default CountUp;



