"use client";

/**
 * VisitorStatusBar — bottom status strip for the visitor console.
 *
 * Renders the compact visitor summary:
 *   ● Visitor: N activities · M pending · K records
 *
 * Counts are passed in from RoleConsole, which derives them from the
 * /api/visitors/mine feed (the calling visitor's own visitor_logs rows,
 * self-scoped by user_id — no hostel/branch filter).
 */

import { Clock, Loader2, DoorOpen, Inbox, FileSpreadsheet } from "lucide-react";

export interface VisitorCounts {
  /** Total recent visit activities visible in the feed. */
  activities: number;
  /** Pending / unresolved visit actions (active or awaiting approval). */
  pending: number;
  /** Completed visit records. */
  records: number;
  /** Whether an active check-in is currently in progress. */
  active: boolean;
}

export interface VisitorStatusBarProps {
  counts: VisitorCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function VisitorStatusBar({
  counts,
  lastScan,
  refreshing = false,
}: VisitorStatusBarProps) {
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
      aria-label="Visitor status bar"
    >
      {/* Left: activities · pending · records */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)] shrink-0" />
          <span className="text-[var(--text-muted)]">Visitor</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <DoorOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.activities ?? 0} activities
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <Inbox className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.pending ?? 0} pending
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0 shrink">
          <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">
            {counts?.records ?? 0} records
          </span>
        </span>
      </div>

      {/* Right: active state + last updated + refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {counts?.active ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">active visit</span>
          </span>
        ) : null}
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

export default VisitorStatusBar;
