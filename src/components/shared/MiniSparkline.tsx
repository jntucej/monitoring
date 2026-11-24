/**
 * MiniSparkline — inline SVG sparkline, no external chart lib.
 * Accepts numeric series; renders a compact path in a fixed-height box.
 */
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface MiniSparklineProps {
  /** Numeric series, oldest → newest */
  data: number[];
  /** SVG width in px. Default 96. */
  width?: number;
  /** SVG height in px. Default 32. */
  height?: number;
  /** Line + fill color CSS value. Default var(--action-primary). */
  color?: string;
  /** Show area fill. Default true. */
  filled?: boolean;
  className?: string;
}

function buildPath(data: number[], w: number, h: number, pad = 2): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  return data
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MiniSparkline({
  data,
  width = 96,
  height = 32,
  color = "var(--action-primary)",
  filled = true,
  className,
}: MiniSparklineProps) {
  const path = useMemo(() => buildPath(data, width, height), [data, width, height]);
  const areaPath = useMemo(() => {
    if (!filled || !path) return "";
    return `${path} L${width - 2},${height} L2,${height} Z`;
  }, [path, filled, width, height]);

  const gradId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  if (data.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`Trend: ${data.length} points, latest ${data[data.length - 1]}`}
    >
      {filled && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default MiniSparkline;
