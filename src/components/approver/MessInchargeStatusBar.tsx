"use client";

/**
 * MessInchargeStatusBar — bottom status strip for the mess In-charge console.
 *
 * Renders the compact mess summary:
 *   ● Mess: N days scheduled · M meals today · K pending requests
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/mess/days (days scheduled) and /api/mess/meal-counts (meals today)
 * fetches. The "pending requests" figure reuses the operational-requests
 * proxy until a dedicated pending-request source lands.
 */

import { Clock, Loader2, UtensilsCrossed, CalendarDays } from "lucide-react";

export interface MessInchargeCounts {
  /** Number of scheduled mess days visible in the feed. */
  daysScheduled: number;
  /** Meals/selections expected today (declared present for the active day). */
  mealsToday: number;
  /** Pending operational requests awaiting the mess In-charge. */
  pendingRequests: number;
  /** Whether an active service window is open right now. */
  active: boolean;
}

export interface MessInchargeStatusBarProps {
  counts: MessInchargeCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function MessInchargeStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: MessInchargeStatusBarProps) {
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
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Mess status bar"
    >
      {/* Left: days scheduled · meals today · pending requests */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)] shrink-0" />
          <span className="text-[var(--text-muted)]">Mess</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <CalendarDays className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.daysScheduled ?? 0} days scheduled
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.mealsToday ?? 0} meals today
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          {counts?.active ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
          )}
          <span className="text-[var(--text-muted)]">
            {counts?.pendingRequests ?? 0} pending requests
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

export default MessInchargeStatusBar;
