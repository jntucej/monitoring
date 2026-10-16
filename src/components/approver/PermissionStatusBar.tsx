"use client";

/**
 * PermissionStatusBar — bottom status strip for the HOD console.
 *
 * The parent (RoleConsole) computes the counts from the fetched
 * /api/permissions response and passes them in. No extra requests here.
 */

import { Clock, Loader2, ShieldCheck } from "lucide-react";

export interface PermissionCounts {
  pending: number;
  escalated: number;
  attendancePct: number | null;
  total: number;
}

export interface PermissionStatusBarProps {
  counts: PermissionCounts | null;
  /** Timestamp of the last HOD data refresh (ISO). */
  lastScan?: string | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function PermissionStatusBar({ counts, lastScan, refreshing = false }: PermissionStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Permission status bar"
    >
      {/* Left: pending / escalated / attendance */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-[var(--text-muted)]">pending</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.pending ?? 0}
          </span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          escalated
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts && counts.escalated > 0 ? counts.escalated : "—"}
          </span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          attendance
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.attendancePct != null ? `${counts.attendancePct}%` : "—"}
          </span>
        </span>

        <span className="hidden lg:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          total
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.total ?? 0}
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
