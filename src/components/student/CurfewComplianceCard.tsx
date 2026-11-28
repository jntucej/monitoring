"use client";

import { Moon, Clock, ShieldCheck, AlertCircle } from "lucide-react";

interface CurfewComplianceCardProps {
  curfewScore?: number;
  curfewTime?: string;
  onTimeReturns?: number;
  lateReturns?: number;
}

export function CurfewComplianceCard({
  curfewScore,
  curfewTime,
  onTimeReturns,
  lateReturns,
}: CurfewComplianceCardProps) {
  const hasData =
    curfewScore !== undefined ||
    onTimeReturns !== undefined ||
    lateReturns !== undefined;
  const scoreKnown = curfewScore !== undefined;
  const isHighCompliance = scoreKnown && curfewScore >= 90;
  const isModerate = scoreKnown && curfewScore >= 75 && curfewScore < 90;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Curfew Compliance
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            !scoreKnown
              ? "bg-slate-100 text-slate-500 border border-slate-200"
              : isHighCompliance
              ? "bg-emerald-500/15 text-action-success"
              : isModerate
              ? "bg-amber-500/15 text-action-warning"
              : "bg-rose-500/15 text-action-danger"
          }`}
        >
          {!scoreKnown
            ? "No Data"
            : isHighCompliance
            ? "Good Standing"
            : isModerate
            ? "Caution"
            : "Restricted"}
        </span>
      </div>

      {!hasData ? (
        <p className="text-xs text-text-muted">
          No curfew compliance data recorded yet.
        </p>
      ) : (
        <>
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold tabular-nums text-text-primary">
            {curfewScore}%
          </span>
          <span className="text-xs text-text-muted ml-1.5">30-day compliance</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>Curfew: {curfewTime ?? "—"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-action-success" /> On-time
          </span>
          <span className="text-xs font-bold font-mono text-text-primary tabular-nums">
            {onTimeReturns ?? 0}
          </span>
        </div>
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-action-warning" /> Late/Overdue
          </span>
          <span className="text-xs font-bold font-mono text-text-primary tabular-nums">
            {lateReturns ?? 0}
          </span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default CurfewComplianceCard;
