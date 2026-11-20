/**
 * DeltaBadge — shows change vs a reference period ("vs last month +12%").
 * `value` is the current metric, `reference` is the comparable previous period.
 * Renders nothing when reference is 0 or missing (avoids division-by-zero / "∞%").
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeltaBadgeProps {
  /** Current value */
  value: number;
  /** Previous-period value to compare against */
  reference: number | null | undefined;
  /** Human label for the reference period, e.g. "vs last month" */
  label?: string;
  /** Higher is better (default true). Set false for metrics like complaints where lower = better. */
  higherIsBetter?: boolean;
  className?: string;
}

export function DeltaBadge({
  value,
  reference,
  label = "vs last period",
  higherIsBetter = true,
  className,
}: DeltaBadgeProps) {
  if (reference == null || reference === 0) return null;

  const delta = value - reference;
  const pct = reference !== 0 ? ((value - reference) / Math.abs(reference)) * 100 : 0;
  const isFlat = Math.abs(delta) < 0.001;
  const isUp = delta > 0;
  const isGood = isFlat ? true : higherIsBetter ? isUp : !isUp;

  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const cls = isFlat
    ? "text-text-muted"
    : isGood
      ? "text-emerald-500"
      : "text-rose-500";

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", cls, className)}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {isFlat ? "0" : `${isUp ? "+" : ""}${Math.round(pct)}%`}
      <span className="text-text-muted font-normal">{label}</span>
    </span>
  );
}

export default DeltaBadge;
