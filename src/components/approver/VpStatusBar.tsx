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
      className="flex items-center gap-3 px-4 py-1.5 border-t border-[var(--border)] bg-[var(--bg-base)]/90 backdrop-blur-sm text-[11px] font-mono min-w-0"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${
              refreshing ? "animate-ping bg-emerald-400/60" : "bg-emerald-400"
            } opacity-75`}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[var(--text-secondary)] font-semibold">Vice Principal</span>
      </span>

      <span className="flex items-center gap-3 flex-wrap min-w-0">
        <span className="text-[var(--text-secondary)]">
          <span className="text-sky-400 font-bold">{pending}</span> pending
        </span>
        <span className="text-[var(--text-secondary)]">
          <span className="text-amber-400 font-bold">{active}</span> active
        </span>
        <span className="text-[var(--text-secondary)]">
          <span className="text-emerald-400 font-bold">{records}</span> records
        </span>
      </span>

      <span className="ml-auto flex items-center gap-1.5 shrink-0 text-[var(--text-muted)]">
        {refreshing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span className="text-[10px]">
            {lastScan ? `scan ${new Date(lastScan).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "no data"}
          </span>
        )}
      </span>
    </div>
  );
}

export default VpStatusBar;
