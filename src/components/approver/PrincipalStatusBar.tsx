"use client";

/**
 * PrincipalStatusBar — bottom status strip for the Principal console.
 *
 * Renders the compact institutional summary:
 *   ● Principal: N pending approvals · M active · K records
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/principal/dashboard fetch.
 */

import { Clock, Loader2 } from "lucide-react";

export interface PrincipalCounts {
  /** Number of pending approvals at the principal stage. */
  pending: number;
  /** Number of active (open) alerts. */
  active: number;
  /** Number of audit records surfaced. */
  records: number;
}

export interface PrincipalStatusBarProps {
  counts: PrincipalCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function PrincipalStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: PrincipalStatusBarProps) {
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

  return (
    <footer
      className="surface-card flex items-center justify-between gap-4 px-4 py-2 bg-bg-surface/95 backdrop-blur-md text-xs text-text-secondary select-none"
      aria-label="Principal status bar"
    >
      {/* Left: principal summary */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className={`size-2 rounded-full shrink-0 ${
              refreshing ? "bg-action-warning animate-pulse" : "bg-action-success"
            }`}
          />
          <span className="font-semibold text-text-primary">Principal</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">pending approvals</span>
          <span className="font-mono tabular-nums font-bold text-action-warning">
            {counts?.pending ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">active</span>
          <span className="font-mono tabular-nums font-bold text-text-primary">
            {counts?.active ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted">records</span>
          <span className="font-mono tabular-nums font-bold text-text-secondary">
            {counts?.records ?? 0}
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

export default PrincipalStatusBar;
