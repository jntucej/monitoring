"use client";

import { forwardRef, useEffect, useRef } from "react";
import { motion, useSpring } from "framer-motion";
import { SPRING_MAGNETIC } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  strength?: number;
  radius?: number;
}

export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ strength = 0.6, radius = 120, children, style, ...rest }, externalRef) => {
    const localRef = useRef<HTMLButtonElement>(null);
    const reduced = useReducedMotionSafe();
    const x = useSpring(0, SPRING_MAGNETIC);
    const y = useSpring(0, SPRING_MAGNETIC);
    const scale = useSpring(1, SPRING_MAGNETIC);

    useEffect(() => {
      if (reduced) return;
      const el = localRef.current;
      if (!el) return;

      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          const factor = 1 - dist / radius;
          x.set(dx * strength * factor);
          y.set(dy * strength * factor);
          scale.set(1 + factor * 0.05);
        } else {
          x.set(0);
          y.set(0);
          scale.set(1);
        }
      };

      const onLeave = () => {
        x.set(0);
        y.set(0);
        scale.set(1);
      };

      window.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    }, [reduced, radius, strength, x, y, scale]);

    const setRef = (node: HTMLButtonElement | null) => {
      (localRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) {
        (externalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };

    return (
      <motion.button
        ref={setRef}
        style={{ x, y, scale, ...style }}
        whileTap={{ scale: 0.94 }}
        {...(rest as any)}
      >
        {children}
      </motion.button>
    );
  }
);

MagneticButton.displayName = "MagneticButton";
