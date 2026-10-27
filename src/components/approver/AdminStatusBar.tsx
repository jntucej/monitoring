"use client";

/**
 * AdminStatusBar — bottom status strip for the admin console.
 *
 * Renders the compact alerts summary:
 *   ● Admin: N active alerts · M pending · K records
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/admin/alerts fetch (open + recently-resolved alerts). "active" = all
 * currently open alerts; "pending" = open alerts at high/critical severity;
 * "records" = total items returned in the feed (open + recently resolved).
 * The last-scan timestamp + refresh indicator are surfaced on the right.
 */

import { Bell, Clock, Loader2 } from "lucide-react";

export interface AdminCounts {
  /** All currently open (unresolved) alerts in the feed. */
  active: number;
  /** Open alerts at high or critical severity (most likely to need action). */
  pending: number;
  /** Total items in the feed (open + recently resolved). */
  records: number;
}

export interface AdminStatusBarProps {
  counts: AdminCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function AdminStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: AdminStatusBarProps) {
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

  const active = counts?.active ?? 0;
  const pending = counts?.pending ?? 0;
  const records = counts?.records ?? 0;
  const hasAttention = pending > 0;

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Admin status bar"
    >
      {/* Left: alerts summary */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              hasAttention ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          <span className="text-[var(--text-muted)]">Admin</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <Bell className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {active} active alerts · {pending} pending · {records} records
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

export default AdminStatusBar;
