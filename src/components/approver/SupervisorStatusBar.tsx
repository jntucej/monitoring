"use client";

/**
 * SupervisorStatusBar — bottom status strip for the Supervisor console.
 *
 * Renders the compact live-activity summary:
 *   ● Live activity: N escalations · M pending · K critical
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/supervisor/escalations fetch.
 */

import { Radio, Clock, Loader2, ShieldAlert } from "lucide-react";

export interface SupervisorCounts {
  /** Number of open escalations (escalated + SLA-breached). */
  escalations: number;
  /** Number of pending items waiting on the supervisor. */
  pending: number;
  /** Number of critical-priority items. */
  critical: number;
}

export interface SupervisorStatusBarProps {
  counts: SupervisorCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function SupervisorStatusBar({ counts, lastScan, refreshing = false }: SupervisorStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Supervisor status bar"
    >
      {/* Left: live activity · escalations · pending · critical */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-[var(--text-muted)]">Live activity</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">escalations</span>
          <span className="font-mono tabular-nums font-bold text-rose-400">
            {counts?.escalations ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">pending</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.pending ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">critical</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.critical ?? 0}
          </span>
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

export default SupervisorStatusBar;
