"use client";

/**
 * ParentStatusBar — bottom status strip for the parent/guardian console.
 *
 * Renders the compact summary:
 *   ● Parent · N children · M recent activities · K unread · fees due: <amount|none>
 *
 * Counts are passed in from RoleConsole, which reads GET /api/parents/me
 * (self-scoped to the caller's linked children). The feesDue field has no
 * authoritative billing source on /api/parents/me today, so it renders as
 * "none" until a fees endpoint lands.
 */

import { Clock, Loader2 } from "lucide-react";

export interface ParentCounts {
  /** Number of the caller's linked children. */
  children: number;
  /** Total recent activities across all children. */
  activities: number;
  /** Unread notification count (best-effort: 0 until a notifications
   *   source is wired into the parent console). */
  unread: number;
  /** Total fees due. "none" when null (no authoritative source yet). */
  feesDue: number | null;
}

export interface ParentStatusBarProps {
  counts: ParentCounts | null;
  /** Timestamp of the last data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function ParentStatusBar({ counts, lastScan, refreshing = false }: ParentStatusBarProps) {
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

  const feesDueText =
    counts?.feesDue === null || counts?.feesDue === undefined
      ? "none"
      : counts?.feesDue === 0
        ? "none"
        : `$${counts?.feesDue.toLocaleString()}`;

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Parent status bar"
    >
      {/* Left: parent · children · activities · unread · fees due */}
      <div className="flex items-center gap-4 min-w-0 flex-wrap">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[var(--text-muted)]">Parent</span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">children</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.children ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">recent activities</span>
          <span className="font-mono tabular-nums font-bold text-sky-400">
            {counts?.activities ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">unread</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.unread ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--text-muted)]">fees due</span>
          <span
            className={`font-mono tabular-nums font-bold ${
              feesDueText === "none" ? "text-[var(--text-muted)]" : "text-rose-400"
            }`}
          >
            {feesDueText}
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

export default ParentStatusBar;
