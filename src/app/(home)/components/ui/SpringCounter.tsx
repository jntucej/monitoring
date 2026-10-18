"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { SPRING_COUNTER } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface SpringCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Number that springs from 0 to `value` when it enters the viewport.
 * Reduced-motion / tier-static → renders final value immediately.
 */
export function SpringCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: SpringCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotionSafe();

  const spring = useSpring(0, SPRING_COUNTER);
  const display = useTransform(spring, (v) => {
    const formatted = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (reduced) {
      spring.set(value);
    } else if (inView) {
      spring.set(value);
    }
  }, [inView, reduced, spring, value]);

  if (reduced) {
    const formatted =
      decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
    return (
      <span ref={ref} className={className}>
        {`${prefix}${formatted}${suffix}`}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
