"use client";

/**
 * SupervisorStatusBar — bottom status strip for the Supervisor console.
 *
 * Renders the compact gate/escalation summary:
 *   ● N gates online · M escalations · K incidents · shift <label> active
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/supervisor/escalations fetch. The `/api/gates` route exists but
 * the status bar derives "gates online" from the distinct gate count in
 * the escalation feed (no second network request). Shift label is
 * surfaced when available; "—" when not.
 */

import { Loader2 } from "lucide-react";

export interface SupervisorCounts {
  /** Distinct gate count in the escalation feed. */
  gatesOnline: number;
  /** Number of open escalations (escalated + SLA-breached). */
  escalations: number;
  /** Number of active incidents (active alerts). */
  incidents: number;
  /** Current shift label, or null when not available. */
  shift: string | null;
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

  const shiftLabel = counts?.shift ?? "—";

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Supervisor status bar"
    >
      {/* Left: gates · escalations · incidents · shift */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Live indicator */}
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="text-[var(--text-muted)]">
            {counts?.gatesOnline ?? 0} gates online
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">escalations</span>
          <span className="font-mono tabular-nums font-bold text-rose-400">
            {counts?.escalations ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">incidents</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.incidents ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">shift</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {shiftLabel}
          </span>
          <span className="text-[var(--text-muted)]">active</span>
        </span>

        {/* Critical count shown only when > 0 */}
        {counts && counts.critical > 0 ? (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="text-[var(--text-muted)]">critical</span>
            <span className="font-mono tabular-nums font-bold text-rose-400">
              {counts.critical}
            </span>
          </span>
        ) : null}
      </div>

      {/* Right: last updated + refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {refreshing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
        ) : null}
        {lastScan ? (
          <span className="inline-flex items-center gap-1.5">
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
