"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useGlass } from "@/context/GlassContext";
import { useUIStore } from "@/stores/uiStore";

interface CountUpProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function CountUp({
  value,
  duration = 0.8,
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
}: CountUpProps) {
  const theme = useUIStore((s) => s.theme);
  const { prefersReducedMotion, performanceTier, isTouchDevice } = useGlass();
  const [mounted, setMounted] = useState(false);

  const isMobileOrLowFps =
    isTouchDevice ||
    performanceTier === "legacy" ||
    performanceTier === "emergency" ||
    performanceTier === "low" ||
    prefersReducedMotion;

  const spring = useSpring(0, {
    damping: isMobileOrLowFps ? 30 : 20,
    stiffness: isMobileOrLowFps ? 150 : 100,
  });

  useEffect(() => {
    setMounted(true);
    // Reset spring to zero on theme change or mount to trigger count-up animation
    spring.set(0);
    const timer = setTimeout(() => {
      spring.set(value);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [value, delay, spring, theme]);

  const display = useTransform(spring, (v) => {
    const formatted = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

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

