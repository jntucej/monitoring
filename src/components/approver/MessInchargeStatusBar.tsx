"use client";

/**
 * MessInchargeStatusBar — bottom status strip for the mess In-charge console
 * (digest-board spec).
 *
 * Renders the compact mess service summary:
 *   ● <Meal window label> open · N served · M no-shows · window closes HH:MM
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/mess/analytics digest (served = confirmedPresent, no-shows =
 * declaredPresent - confirmedPresent) plus the /api/mess/days window-close
 * time. The meal-window label is derived from the active day's meal type.
 */

import { Clock, Loader2, UtensilsCrossed } from "lucide-react";

export interface MessInchargeCounts {
  /** The meal window label (e.g. "Lunch", "Dinner", "Breakfast"). */
  mealWindow: string | null;
  /** Number of confirmed-served meals (from the analytics digest). */
  served: number;
  /** Number of no-shows (declared present but not confirmed). */
  noShows: number;
  /** Whether an active service window is open right now. */
  active: boolean;
  /** The active day's window-close timestamp (ISO), or null. */
  windowCloses: string | null;
}

export interface MessInchargeStatusBarProps {
  counts: MessInchargeCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

function fmtWindow(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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

  const windowLabel = counts?.mealWindow ?? "Service";

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Mess status bar"
    >
      {/* Left: <window> open · N served · M no-shows · window closes HH:MM */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              counts?.active ? "bg-emerald-400" : "bg-[var(--text-muted)]"
            }`}
          />
          <span className="text-[var(--text-muted)]">
            {windowLabel} {counts?.active ? "open" : "closed"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.served ?? 0} served
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          <span className="text-[var(--text-muted)]">
            {counts?.noShows ?? 0} no-shows
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            window closes {fmtWindow(counts?.windowCloses)}
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
