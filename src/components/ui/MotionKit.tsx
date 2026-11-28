"use client";

import React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import { useEffectivePref } from "@/hooks/useEffectivePref";

/**
 * MotionKit — GPU-safe motion primitives for the compressed high-context hubs.
 * Every animation is `transform` + `opacity` only (never layout, never
 * backdrop-filter blur) and automatically respects both the OS
 * `prefers-reduced-motion` AND the app's `a11y.reduceMotion` pref.
 */
export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};
export const SPRING_GENTLE = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
  mass: 0.8,
};

function useMotionDisabled(): boolean {
  const osReduced = useReducedMotion();
  const { value: prefReduced } = useEffectivePref("a11y.reduceMotion");
  return Boolean(osReduced || prefReduced);
}

/** Staggered container for KPI rows + bento grids. */
export function MotionBentoGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const disabled = useMotionDisabled();
  return (
    <motion.div
      initial={disabled ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.045 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Tactile bento card: spring entry + subtle lift on hover/tap. */
export function MotionBentoCard({
  children,
  className = "",
  interactive = false,
  ...props
}: HTMLMotionProps<"div"> & { interactive?: boolean }) {
  const disabled = useMotionDisabled();
  return (
    <motion.div
      layout={!disabled}
      variants={
        disabled
          ? undefined
          : {
              hidden: { opacity: 0, y: 10, scale: 0.985 },
              visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAPPY },
            }
      }
      whileHover={
        interactive && !disabled
          ? { y: -2, transition: SPRING_SNAPPY }
          : undefined
      }
      whileTap={interactive && !disabled ? { scale: 0.985 } : undefined}
      className={`rounded-2xl bg-bg-surface border border-border shadow-sm ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Smooth cross-slide panel for BlobTabs content swaps. */
export function MotionTabPanel({
  tabKey,
  children,
  className = "",
}: {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const disabled = useMotionDisabled();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={disabled ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={disabled ? undefined : { opacity: 0, y: -6 }}
        transition={disabled ? { duration: 0 } : SPRING_GENTLE}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
