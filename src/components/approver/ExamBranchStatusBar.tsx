"use client";

/**
 * ExamBranchStatusBar — bottom status strip for the exam-branch console.
 *
 * Renders the compact exam-branch summary:
 *   ● <Branch> · N pending · M handoff · K discrepancies
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * self-scoped /api/permissions?workflow_type=exam&branch=:self fetch.
 * The `branch` field is the caller's own department/branch code (resolved
 * server-side; rendered as "—" when not yet available).
 */

import { Clock, Loader2 } from "lucide-react";

export interface ExamBranchCounts {
  /** The caller's branch/department code. null until resolved. */
  branch: string | null;
  /** Number of PENDING exam tickets in the caller's branch. */
  pending: number;
  /** Number of tickets currently at the exam_branch_forwarded stage. */
  handoff: number;
  /** Number of open discrepancies (no source yet — placeholder 0). */
  discrepancies: number;
}

export interface ExamBranchStatusBarProps {
  counts: ExamBranchCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function ExamBranchStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: ExamBranchStatusBarProps) {
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

  const branch = counts?.branch;
  const pending = counts?.pending ?? 0;
  const handoff = counts?.handoff ?? 0;
  const discrepancies = counts?.discrepancies ?? 0;

  return (
    <footer
      className="surface-card flex items-center justify-between gap-4 px-4 py-2 bg-bg-surface/95 backdrop-blur-md text-xs text-text-secondary select-none"
      aria-label="Exam Branch status bar"
    >
      {/* Left: branch · pending · handoff · discrepancies */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="size-2 rounded-full bg-action-primary shrink-0" />
          <span className="text-text-muted uppercase tracking-wider">
            {branch ?? "branch"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">pending</span>
          <span className="font-mono tabular-nums font-bold text-action-warning">
            {pending}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">handoff</span>
          <span className="font-mono tabular-nums font-bold text-action-info">
            {handoff}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">discrepancies</span>
          <span
            className={`font-mono tabular-nums font-bold ${
              discrepancies > 0
                ? "text-action-danger"
                : "text-text-secondary"
            }`}
          >
            {discrepancies}
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

export default ExamBranchStatusBar;
