"use client";

/**
 * SysadminStatusBar — bottom status strip for the sysadmin console.
 *
 * Renders the compact service summary:
 *   ● SysAdmin: N services up · M degraded · K down
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/sysadmin/application-health fetch (service + database + gateway
 * statuses). The last-check timestamp + refresh indicator are surfaced on the
 * right.
 */

import { Activity, Clock, Loader2 } from "lucide-react";

export interface SysadminCounts {
  /** Services reporting "healthy". */
  up: number;
  /** Services reporting "degraded". */
  degraded: number;
  /** Services reporting "unhealthy" (or the overall status is down). */
  down: number;
}

export interface SysadminStatusBarProps {
  counts: SysadminCounts | null;
  /** Timestamp of the last health check (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function SysadminStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: SysadminStatusBarProps) {
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

  const up = counts?.up ?? 0;
  const degraded = counts?.degraded ?? 0;
  const down = counts?.down ?? 0;
  const anyProblem = down > 0 || degraded > 0;

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="SysAdmin status bar"
    >
      {/* Left: service summary */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              anyProblem ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          <span className="text-[var(--text-muted)]">SysAdmin</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {up} up · {degraded} degraded · {down} down
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
            <span className="text-[var(--text-muted)]">last check</span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              {fmt(lastScan)}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}

export default SysadminStatusBar;
