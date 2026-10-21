"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniSparklineProps extends MiniProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function MiniSparkline({
  values,
  label,
  color,
  width = 44,
  height = 16,
  onClick,
  className,
}: MiniSparklineProps) {
  // Guard: an empty or non-array values list makes Math.min(...[]) = Infinity
  // and the path/cords come out as "NaN,NaN" which React logs as
  // 'Problem parsing "NaN,NaN"'. Render an empty placeholder instead.
  if (!Array.isArray(values) || values.length < 2) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={label}
        className={cn("flex items-center min-w-0", className)}
      >
        <span
          aria-hidden
          className="block shrink-0 opacity-30"
          style={{ width, height }}
        />
      </button>
    );
  }

  const strokeColor = color ?? "var(--action-primary)";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center min-w-0", className)}
    >
      <svg width={width} height={height} className="shrink-0 overflow-visible">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
