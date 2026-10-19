"use client";

import { useEffect, type RefObject } from "react";
import { useSpring, type MotionValue } from "framer-motion";
import { SPRING_CURSOR } from "../hooks/useSpringConfig";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

interface MagneticReturn {
  x: MotionValue<number>;
  y: MotionValue<number>;
  disabled: boolean;
}

/**
 * Attaches a pointer-driven magnetic translation to a ref'd element.
 * Disabled entirely on tier "static" or reduced motion (returns 0,0).
 */
export function useMagneticCursor(
  ref: RefObject<HTMLElement | null>,
  strength = 0.4
): MagneticReturn {
  const tier = usePerformanceTier();
  const reduced = useReducedMotionSafe();
  const disabled = reduced || tier === "static";

  const x = useSpring(0, SPRING_CURSOR);
  const y = useSpring(0, SPRING_CURSOR);

  useEffect(() => {
    if (disabled) {
      x.set(0);
      y.set(0);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((e.clientX - cx) * strength);
      y.set((e.clientY - cy) * strength);
    };

    const onLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref, strength, x, y, disabled]);

  return { x, y, disabled };
}
