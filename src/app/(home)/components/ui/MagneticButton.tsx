"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { useMagneticCursor } from "../hooks/useMagneticCursor";

export interface MagneticButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">> {
  strength?: number;
}

/**
 * A native button wrapped in a magnetic-translation surface.
 * Preserves all native button semantics (type, onClick, aria-*, etc.).
 * Falls back to a plain (unmagnified) button on tier "static".
 */
export const MagneticButton = forwardRef<
  HTMLButtonElement,
  MagneticButtonProps & HTMLMotionProps<"button">
>(({ strength = 0.4, children, style, ...rest }, externalRef) => {
  const localRef = useRef<HTMLButtonElement>(null);
  const { x, y } = useMagneticCursor(localRef, strength);

  const setRef = (node: HTMLButtonElement | null) => {
    (localRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    if (typeof externalRef === "function") externalRef(node);
    else if (externalRef) {
      (externalRef as React.MutableRefObject<HTMLButtonElement | null>).current =
        node;
    }
  };

  return (
    <motion.button
      ref={setRef}
      style={{ x, y, ...style }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

MagneticButton.displayName = "MagneticButton";
