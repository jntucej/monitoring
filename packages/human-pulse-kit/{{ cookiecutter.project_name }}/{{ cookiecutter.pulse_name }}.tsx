{%- set use_framer = cookiecutter.render_strategy in ('framer-motion', 'both') -%}
{%- set use_css    = cookiecutter.render_strategy in ('css', 'both')          -%}
"use client";

import React, { forwardRef, useMemo } from "react";
{%- if use_framer %}
import { motion, useReducedMotion } from "framer-motion";
{%- endif %}
import { cn } from "@/lib/utils";
{%- if use_css %}
import "./{{ cookiecutter.pulse_name }}.css";
{%- endif %}

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

export interface {{ cookiecutter.pulse_name }}Props
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
const BEAT_DURATION_S = {{ cookiecutter.beat_duration_ms }} / 1000;
const LUB_SCALE       = {{ cookiecutter.lub_scale }};
const DUB_SCALE       = {{ cookiecutter.dub_scale }};
const REST_OPACITY    = {{ cookiecutter.rest_opacity }};
const REPEAT_DELAY_S  = {{ cookiecutter.repeat_delay_s }};
const RESPECT_REDUCED = {{ 'true' if cookiecutter.respect_reduced_motion == 'yes' else 'false' }};
const RENDER_STRATEGY: "css" | "framer-motion" | "both" =
  "{{ cookiecutter.render_strategy }}";

export const {{ cookiecutter.pulse_name }} = forwardRef<
  HTMLSpanElement,
  {{ cookiecutter.pulse_name }}Props
>(function {{ cookiecutter.pulse_name }}(
  {
    variant = "dot",
    color = "{{ cookiecutter.dot_color }}",
    size = {{ cookiecutter.dot_size_px }},
    label,
    delayMs = 0,
    className,
    style,
    ...props
  },
  ref
) {
{%- if use_framer %}
  const prefersReduced = useReducedMotion();
  const reduced = RESPECT_REDUCED && !!prefersReduced;
{%- endif %}
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

{%- if use_framer and use_css %}
  const useMotion =
    RENDER_STRATEGY === "framer-motion" ||
    (RENDER_STRATEGY === "both" && !reduced);
{%- elif use_framer %}
  const useMotion = true;
{%- else %}
  const useMotion = false;
{%- endif %}

  if (useMotion) {
{%- if use_framer %}
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
{%- endif %}
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

{{ cookiecutter.pulse_name }}.displayName = "{{ cookiecutter.pulse_name }}";
