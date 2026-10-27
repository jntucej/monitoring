"use client";

import React, { forwardRef, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./HumanPulseDot.css";

export type PulseVariant = "dot" | "badge" | "orb";
export type PulseColor =
  | "mint"
  | "rose"
  | "gold"
  | "sky"
  | "amber"
  | "violet"
  | (string & {});

const COLOR_MAP: Record<string, string> = {
  mint:   "#34d399",
  rose:   "#f43f5e",
  gold:   "#f59e0b",
  sky:    "#38bdf8",
  amber:  "#fbbf24",
  violet: "#a78bfa",
};

export interface HumanPulseDotProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PulseVariant;
  color?: PulseColor;
  size?: number;
  label?: string;
  /** Stagger sibling dots by a few ms to sell the lub-dub cadence. */
  delayMs?: number;
}

// ── Beat tuning — the shape that makes it feel human ───────────────────
//   lub  (strong, quick)  →  relax  →  dub (softer, quick)  →  long rest
// A sine-wave pulse is ONE even throb; this is TWO unequal beats + a pause.
const BEAT_DURATION_S = 1100 / 1000;
const LUB_SCALE       = 1.20;
const DUB_SCALE       = 1.12;
const REST_OPACITY    = 0.90;
const REPEAT_DELAY_S  = 0.6;
const RESPECT_REDUCED = true;
const RENDER_STRATEGY: string =
  "both";

export const HumanPulseDot = forwardRef<
  HTMLSpanElement,
  HumanPulseDotProps
>(function HumanPulseDot(
  {
    variant = "dot",
    color = "#34d399",
    size = 8,
    label,
    delayMs = 0,
    className,
    style,
    ...props
  },
  ref
) {
  const prefersReduced = useReducedMotion();
  const reduced = RESPECT_REDUCED && !!prefersReduced;
  const resolved = COLOR_MAP[color] ?? color;

  const beat = useMemo(
    () => ({
      scale:   [1, LUB_SCALE, 1, DUB_SCALE, 1],
      opacity: [1, 1, REST_OPACITY, 1, REST_OPACITY],
    }),
    []
  );

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: resolved,
    boxShadow: `0 0 8px 2px ${resolved}8c`,
    ...style,
  };
  const useMotion =
    RENDER_STRATEGY === "framer-motion" ||
    (RENDER_STRATEGY === "both" && !reduced);

  if (useMotion) {
    return (
      <motion.span
        ref={ref}
        role="status"
        aria-label={label ?? "live status"}
        className={cn("inline-block rounded-full", `pulse-${variant}`, className)}
        style={baseStyle}
        animate={RESPECT_REDUCED && reduced ? undefined : beat}

        transition={{
          duration: BEAT_DURATION_S,
          times: [0, 0.10, 0.20, 0.30, 0.45],
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: REPEAT_DELAY_S,
          delay: delayMs / 1000,
        }}

        {...(props as any)}
      />
    );
  }

  return (
    <span
      ref={ref}
      role="status"
      aria-label={label ?? "live status"}
      className={cn(
        "inline-block rounded-full",
        "human-pulse-dot",
        `pulse-${variant}`,
        className
      )}

      style={{
        ...baseStyle,
        ["--pulse-color" as any]:   resolved,
        ["--pulse-size" as any]:    `${size}px`,
        ["--pulse-delay" as any]:   `${delayMs}ms`,
        ["--beat-duration" as any]: `${BEAT_DURATION_S}s`,
        ["--lub-scale" as any]:     LUB_SCALE,
        ["--dub-scale" as any]:     DUB_SCALE,
        ["--rest-opacity" as any]:  REST_OPACITY,
      }}

      {...props}
    />
  );
});

HumanPulseDot.displayName = "HumanPulseDot";
