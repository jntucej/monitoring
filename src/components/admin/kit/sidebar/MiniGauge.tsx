"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniGaugeProps extends MiniProps {
  value: number; // 0..1
  color?: string;
  size?: number;
}

export function MiniGauge({ value, label, color, size = 18, onClick, className }: MiniGaugeProps) {
  // Guard: an undefined / null / NaN value makes the dash-offset string come
  // out as "NaN" which React logs as a path-parsing error. Clamp to 0..1.
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);
  const ringColor = color ?? "var(--action-primary)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center h-5 min-w-0", className)}
    >
      <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
    </button>
  );
}
