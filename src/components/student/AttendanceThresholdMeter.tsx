"use client";

import { useMemo } from "react";
import { computeAttendanceCushion } from "@/lib/attendance-schedule-math";
import { AlertTriangle, CheckCircle2, ShieldCheck, Flame } from "lucide-react";

interface AttendanceThresholdMeterProps {
  attended: number;
  total: number;
  targetPct?: number;
}

export function AttendanceThresholdMeter({
  attended,
  total,
  targetPct = 75,
}: AttendanceThresholdMeterProps) {
  const cushion = useMemo(
    () => computeAttendanceCushion(attended, total, targetPct),
    [attended, total, targetPct]
  );

  const pct = cushion.pct;
  const isSafe = !cushion.atRisk;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isSafe ? (
            <ShieldCheck className="w-5 h-5 text-action-success" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-action-danger" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Attendance Threshold Meter
            </h3>
            <p className="text-xs text-text-muted">
              Target minimum threshold: {targetPct}%
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isSafe
              ? "bg-emerald-500/15 text-action-success"
              : "bg-rose-500/15 text-action-danger"
          }`}
        >
          {isSafe ? "Eligible" : "At Risk"}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-3xl font-bold text-text-primary tabular-nums">
            {pct}%
          </span>
          <span className="text-xs text-text-muted ml-2 font-mono tabular-nums">
            {attended} of {total} classes attended
          </span>
        </div>
        <div className="text-right">
          {isSafe ? (
            <p className="text-xs font-semibold text-action-success flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="tabular-nums font-mono">{cushion.safeSkips}</span> safe skips available
            </p>
          ) : (
            <p className="text-xs font-semibold text-action-danger flex items-center gap-1 justify-end">
              <Flame className="w-3.5 h-3.5" />
              Must attend next <span className="tabular-nums font-mono">{cushion.classesNeeded}</span> classes
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar with 75% target marker */}
      <div className="relative pt-2 pb-1">
        <div className="h-3 w-full rounded-full bg-bg-elevated overflow-hidden flex border border-border/50">
          <div
            className={`h-full transition-all duration-300 ${
              isSafe ? "bg-emerald-600" : "bg-rose-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        {/* 75% Target Pin */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
          style={{ left: `${targetPct}%` }}
        >
          <div className="w-0.5 h-full bg-text-primary/70" />
          <span className="text-[10px] font-mono text-text-muted absolute -top-1">
            {targetPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceThresholdMeter;
