"use client";

import { useMemo } from "react";
import { BookOpen, ShieldAlert, CheckCircle2 } from "lucide-react";

export interface SubjectRiskItem {
  code: string;
  name: string;
  attended: number;
  total: number;
}

interface SubjectRiskBreakdownProps {
  subjects: SubjectRiskItem[];
}

export function SubjectRiskBreakdown({ subjects }: SubjectRiskBreakdownProps) {
  const processed = useMemo(() => {
    return subjects.map((sub) => {
      const pct = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 100;
      const atRisk = pct < 75;
      return {
        ...sub,
        pct,
        atRisk,
      };
    });
  }, [subjects]);

  if (processed.length === 0) {
    return (
      <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Subject-wise Risk Breakdown
          </h3>
        </div>
        <p className="text-xs text-text-muted">
          No individual subject breakdown configured for this cohort.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Subject-wise Risk Breakdown
          </h3>
        </div>
        <span className="text-xs text-text-muted">Target: 75%</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {processed.map((sub) => (
          <div
            key={sub.code}
            className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
              sub.atRisk
                ? "border-rose-500/30 bg-rose-500/5"
                : "border-border bg-bg-elevated"
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">
                  {sub.code}
                </p>
                <p className="text-[11px] text-text-muted truncate">{sub.name}</p>
              </div>
              <span
                className={`text-xs font-bold tabular-nums font-mono px-1.5 py-0.5 rounded ${
                  sub.atRisk
                    ? "bg-rose-500/20 text-action-danger"
                    : "bg-emerald-500/20 text-action-success"
                }`}
              >
                {sub.pct}%
              </span>
            </div>

            <div className="mt-2.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sub.atRisk ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, sub.pct))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
                <span>
                  {sub.attended}/{sub.total} classes
                </span>
                {sub.atRisk ? (
                  <span className="text-action-danger flex items-center gap-0.5">
                    <ShieldAlert className="w-3 h-3" /> Risk
                  </span>
                ) : (
                  <span className="text-action-success flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Safe
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubjectRiskBreakdown;
