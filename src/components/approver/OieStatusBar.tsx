"use client";

/**
 * OieStatusBar — bottom status strip for the OIE exam-desk console.
 *
 * Renders the compact exam-queue summary:
 *   ● Exam queue · N pending · M exceptions · exam day: open/closed
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/oie/queue (pending) and /api/exam/access-exceptions (exceptions)
 * fetches, plus the exam-day gate state from /api/exam/access.
 */

import { Clock, Loader2, ShieldAlert, CalendarClock } from "lucide-react";

export interface OieCounts {
  /** Number of PENDING exam tickets in the OIE queue. */
  pending: number;
  /** Number of access exceptions (rejected / escalated / SLA-breached). */
  exceptions: number;
  /**
   * Exam-day gate access state. "open" | "closed" when /api/exam/access
   * exposes it; null when the state is not yet resolved.
   */
  examDay: "open" | "closed" | null;
}

export interface OieStatusBarProps {
  counts: OieCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function OieStatusBar({ counts, lastScan, refreshing = false }: OieStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "—";
    }
  };

  const examDay = counts?.examDay;
  const examDayTone =
    examDay === "open"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : examDay === "closed"
        ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
        : "text-[var(--text-muted)] bg-[var(--bg-base)] border-[var(--border)]";

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="OIE exam status bar"
    >
      {/* Left: exam queue · pending · exceptions · exam day */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)] shrink-0" />
          <span className="text-[var(--text-muted)]">Exam queue</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">pending</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.pending ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">exceptions</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.exceptions ?? 0}
          </span>
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold ${examDayTone}`}
        >
          <CalendarClock className="w-3 h-3" />
          exam day: {examDay ?? "—"}
        </span>
      </div>

      {/* Right: last updated + refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {refreshing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
        ) : null}
        {lastScan ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">last updated</span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              {fmt(lastScan)}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}

export default OieStatusBar;
