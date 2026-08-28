"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function CountUp({ value, duration = 0.8, delay = 0, className = "" }: CountUpProps) {
  const spring = useSpring(0, { damping: 20, stiffness: 100 });

  useEffect(() => {
    const timer = setTimeout(() => {
      spring.set(value);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [value, delay, spring]);

  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  return <motion.span className={className}>{display}</motion.span>;
}

export default CountUp;
