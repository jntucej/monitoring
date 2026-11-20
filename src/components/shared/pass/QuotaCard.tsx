/**
 * shared/pass/QuotaCard — per-quotaKey progress bars.
 * Shows remaining quota for a student (hosteller outpass, etc.).
 *
 * Reads quota usage from /api/student/quota (or falls back to 0 used).
 * Driven by PassTypeConfig.quotaKey / quotaLimit / quotaWindow.
 */

"use client";

import { useEffect, useState } from "react";
import { Gauge, AlertTriangle } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import type { PassTypeConfig } from "@/lib/pass-types";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

export interface QuotaCardProps {
  /** The pass type config to show quota for (must have a quotaKey). */
  config: PassTypeConfig;
  /** Used count for this quota window. If null, component fetches it. */
  used?: number;
  className?: string;
}

export function QuotaCard({ config, used: usedProp, className }: QuotaCardProps) {
  const [used, setUsed] = useState<number | null>(usedProp ?? null);

  useEffect(() => {
    if (usedProp != null) {
      setUsed(usedProp);
      return;
    }
    if (!config.quotaKey) return;
    // Best-effort fetch; degrade to 0 if endpoint absent.
    fetch("/api/student/quota", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        const row = (b?.data ?? []).find(
          (x: { key: string }) => x.key === config.quotaKey
        );
        if (row?.used != null) setUsed(Number(row.used));
      })
      .catch(() => {});
  }, [config.quotaKey, usedProp]);

  if (!config.quotaKey || config.quotaLimit == null) return null;

  const usedNum = used ?? 0;
  const remaining = Math.max(0, config.quotaLimit - usedNum);
  const pct = config.quotaLimit > 0 ? Math.min(100, Math.round((usedNum / config.quotaLimit) * 100)) : 0;
  const nearlyExhausted = remaining === 1;
  const exhausted = remaining === 0;

  const barColor = exhausted
    ? "bg-rose-500"
    : nearlyExhausted
      ? "bg-amber-500"
      : "bg-action-primary";

  return (
    <WidgetBoundary name={`quota-${config.quotaKey}`}>
      <div
        className={cn(
          "rounded-xl border border-border bg-bg-elevated p-4",
          exhausted && "border-rose-500/30",
          className
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            {config.quotaKey} quota
          </p>
          <span className="text-[10px] text-text-muted uppercase">{config.quotaWindow}</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              exhausted ? "text-rose-500" : nearlyExhausted ? "text-amber-500" : "text-text-primary"
            )}
          >
            {remaining}
          </span>
          <span className="text-xs text-text-muted">remaining of {config.quotaLimit}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 rounded-full bg-bg-surface overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>{usedNum} used</span>
          <span>{pct}%</span>
        </div>

        {exhausted && (
          <p className="mt-2 text-[10px] text-rose-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Quota exhausted — warden can override
          </p>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default QuotaCard;
