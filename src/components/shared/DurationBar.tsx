/**
 * DurationBar — compact horizontal bar showing elapsed time vs total.
 * `elapsedMs` / `totalMs` are in milliseconds.
 */
import React from "react";
import { cn } from "@/lib/utils";

export interface DurationBarProps {
  elapsedMs: number;
  totalMs: number;
  /** Show time labels. Default true. */
  showLabel?: boolean;
  /** Color tone. Default "info". */
  tone?: "ok" | "warn" | "danger" | "info";
  className?: string;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function DurationBar({
  elapsedMs,
  totalMs,
  showLabel = true,
  tone = "info",
  className,
}: DurationBarProps) {
  const pct = totalMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
  const barCls: Record<string, string> = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-action-primary",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all", barCls[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs tabular-nums text-text-muted">
          {formatDuration(elapsedMs)} / {formatDuration(totalMs)}
        </span>
      )}
    </div>
  );
}

export default DurationBar;
