"use client";

/**
 * WorkerStatusBar — bottom status strip for the Worker console.
 *
 * Renders the compact worker summary:
 *   ● Worker: N tasks · M active · K work-orders · last update HH:MM
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/workers/my-work digest (tasks + active + work-order counts + the
 * last-update proxy). A read-only surface: no KPI cards, no charts.
 */

import { Clock, Loader2, Wrench } from "lucide-react";

export interface WorkerCounts {
  /** Total open work items / tasks from /api/workers/my-work. */
  tasks: number;
  /** Tasks currently in an active stage (non-PENDING open items). */
  active: number;
  /** Open work orders (maintenance tickets) for the caller. */
  workOrders: number;
}

export interface WorkerStatusBarProps {
  counts: WorkerCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function WorkerStatusBar({ counts, lastScan, refreshing = false }: WorkerStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Worker status bar"
    >
      {/* Left: task / active / work-order counts */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)] shrink-0" />
          <span className="text-[var(--text-muted)]">Worker</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">{counts?.tasks ?? 0} tasks</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">{counts?.active ?? 0} active</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Wrench className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">{counts?.workOrders ?? 0} work-orders</span>
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
            <span className="text-[var(--text-muted)]">last update</span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              {fmt(lastScan)}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}

export default WorkerStatusBar;
