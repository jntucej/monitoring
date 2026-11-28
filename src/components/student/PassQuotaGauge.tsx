"use client";

import { Gauge, ShieldAlert } from "lucide-react";

interface PassQuotaGaugeProps {
  used: number;
  limit?: number;
  windowLabel?: string;
}

export function PassQuotaGauge({
  used,
  limit = 4,
  windowLabel = "This Month",
}: PassQuotaGaugeProps) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isExhausted = remaining === 0;
  const isNear = remaining === 1;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Pass Quota Gauge
          </h3>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted px-2 py-0.5 rounded-full bg-bg-elevated border border-border">
          {windowLabel}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span
            className={`text-2xl font-bold tabular-nums ${
              isExhausted
                ? "text-action-danger"
                : isNear
                ? "text-action-warning"
                : "text-text-primary"
            }`}
          >
            {remaining}
          </span>
          <span className="text-xs text-text-muted ml-1.5">
            of {limit} passes remaining
          </span>
        </div>
        <span className="text-xs font-mono tabular-nums text-text-muted">
          {used} used ({pct}%)
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isExhausted
              ? "bg-rose-500"
              : isNear
              ? "bg-amber-500"
              : "bg-action-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isExhausted && (
        <p className="text-[11px] text-action-danger flex items-center gap-1 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          Monthly quota exhausted. Emergency requests require warden override.
        </p>
      )}
    </div>
  );
}

export default PassQuotaGauge;
