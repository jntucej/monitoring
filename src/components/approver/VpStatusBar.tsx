"use client";

/**
 * VpStatusBar — status strip for the Vice Principal console.
 *
 * Renders: ● Vice Principal: N pending · M active · K records
 *
 * Counts are derived from the /api/principal/dashboard feed response:
 *   pending = data.pendingApprovals
 *   active  = data.recentAlerts (unresolved alerts currently active)
 *   records = total recent alert rows + pending approvals (audit proxy)
 */

import { Loader2 } from "lucide-react";

export interface VpCounts {
  pending: number;
  active: number;
  records: number;
}

export interface VpStatusBarProps {
  counts: VpCounts | null;
  lastScan: string | null;
  refreshing: boolean;
}

export function VpStatusBar({ counts, lastScan, refreshing }: VpStatusBarProps) {
  const pending = counts?.pending ?? 0;
  const active = counts?.active ?? 0;
  const records = counts?.records ?? 0;

  return (
    <div
      className="surface-card flex items-center gap-3 px-4 py-1.5 bg-bg-base/90 backdrop-blur-sm text-xs font-mono min-w-0"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${
              refreshing ? "animate-ping bg-emerald-400/60" : "bg-action-success"
            } opacity-75`}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-action-success" />
        </span>
        <span className="text-text-secondary font-semibold">Vice Principal</span>
      </span>

      <span className="flex items-center gap-3 flex-wrap min-w-0">
        <span className="text-text-secondary">
          <span className="text-action-info font-bold">{pending}</span> pending
        </span>
        <span className="text-text-secondary">
          <span className="text-action-warning font-bold">{active}</span> active
        </span>
        <span className="text-text-secondary">
          <span className="text-action-success font-bold">{records}</span> records
        </span>
      </span>

      <span className="ml-auto flex items-center gap-1.5 shrink-0 text-text-muted">
        {refreshing ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <span className="text-xs">
            {lastScan ? `scan ${new Date(lastScan).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "no data"}
          </span>
        )}
      </span>
    </div>
  );
}

export default VpStatusBar;
