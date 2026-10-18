"use client";

/**
 * StaffStatusBar — bottom status strip for the Staff console.
 *
 * The parent (RoleConsole) reads /api/staff/my-day + /api/staff/stats and
 * passes the derived counts in. No extra requests here. Mirrors the
 * PermissionStatusBar visual style.
 */

import { Briefcase, Clock, Loader2, UserCheck } from "lucide-react";

export interface StaffCounts {
  shift: string | null;
  tasks: number;
  leavesPending: number;
  lastScan?: string | null;
}

export interface StaffStatusBarProps {
  counts: StaffCounts | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

export function StaffStatusBar({ counts, refreshing = false }: StaffStatusBarProps) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000);
      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const hours = Math.round(diffMin / 60);
      return `${hours}h ago`;
    } catch {
      return null;
    }
  };

  const lastScanText = fmt(counts?.lastScan);

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Staff status bar"
    >
      {/* Left: shift · tasks · leaves · last scan */}
      <div className="flex items-center gap-4 min-w-0 flex-wrap">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[var(--text-muted)]">shift</span>
          <span className="font-mono tabular-nums font-bold text-emerald-400">
            {counts?.shift || "—"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <Briefcase className="w-3.5 h-3.5" />
          <span>tasks</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.tasks ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <UserCheck className="w-3.5 h-3.5" />
          <span>leave pending</span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.leavesPending ?? 0}
          </span>
        </span>

        {lastScanText ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span>last scan</span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              {lastScanText}
            </span>
          </span>
        ) : null}
      </div>

      {/* Right: refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {refreshing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
        ) : null}
      </div>
    </footer>
  );
}
