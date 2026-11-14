"use client";

/**
 * ExamSuperintendentStatusBar — bottom status strip for the exam
 * superintendent console.
 *
 * Renders the compact exam-day summary:
 *   ● Exam day: <active|closed> · N halls open · M incidents · K candidates
 *
 * Counts are passed in from RoleConsole, which derives them from
 * /api/exam/access (authorised rows + gate state) and
 * /api/exam/access-exceptions (unresolved exceptions count).
 */

import { Clock, DoorClosed, DoorOpen, Loader2, ShieldAlert, Users, Building2 } from "lucide-react";

export interface ExamSuperintendentCounts {
  /** Exam-day gate access state: "active" when any row is APPROVED. */
  examDay: "active" | "closed" | null;
  /** Number of authorised access rows (halls open). */
  halls: number;
  /** Number of unresolved exceptions / incidents. */
  incidents: number;
  /** Total authorised count (candidates). */
  candidates: number;
}

export interface ExamSuperintendentStatusBarProps {
  counts: ExamSuperintendentCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function ExamSuperintendentStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: ExamSuperintendentStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const examDay = counts?.examDay;
  const dayTone =
    examDay === "active"
      ? "text-action-success bg-emerald-400/10 border-emerald-400/20"
      : examDay === "closed"
        ? "text-action-danger bg-rose-400/10 border-rose-400/20"
        : "text-text-muted bg-bg-base border-border";

  const DayIcon = examDay === "active" ? DoorOpen : DoorClosed;

  return (
    <footer
      className="surface-card flex items-center justify-between gap-4 px-4 py-2 bg-bg-surface/95 backdrop-blur-md text-xs text-text-secondary select-none min-w-0 overflow-x-auto"
      aria-label="Exam superintendent status bar"
    >
      {/* Left: exam day · halls · incidents · candidates */}
      <div className="flex items-center gap-4 min-w-0 shrink">
        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          <span className="size-2 rounded-full bg-action-primary" />
          <span className="text-text-muted">Exam desk</span>
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold shrink-0 ${dayTone}`}
        >
          <DayIcon className="size-3.5" />
          Exam day: {examDay ?? "—"}
        </span>

        <span className="inline-flex items-center gap-1.5 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">halls open</span>
          <span className="font-mono tabular-nums font-bold text-text-primary">
            {counts?.halls ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">incidents</span>
          <span className="font-mono tabular-nums font-bold text-action-warning">
            {counts?.incidents ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 shrink-0">
          <Users className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">candidates</span>
          <span className="font-mono tabular-nums font-bold text-text-primary">
            {counts?.candidates ?? 0}
          </span>
        </span>
      </div>

      {/* Right: last updated + refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {refreshing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />
        ) : null}
        {lastScan ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted">last updated</span>
            <span className="font-mono tabular-nums text-text-secondary">
              {fmt(lastScan)}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}

export default ExamSuperintendentStatusBar;
