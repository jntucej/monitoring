"use client";

/**
 * HostelManagerStatusBar — bottom status strip for the hostel manager console.
 *
 * Mirrors the CaretakerStatusBar visual style (footer, border-t,
 * bg-surface/95 backdrop-blur, text-[11px], select-none). The parent
 * (RoleConsole) derives the counts from the /api/hostel-manager/summary
 * response (openTickets from pendingCount, hostel from the caller's
 * assignedHostel, occupancy from the presence matrix, maintenance = 0 until
 * a source is wired) and passes them in.
 */

import { Clock, Loader2, Building2, Users, Wrench } from "lucide-react";

export interface HostelManagerCounts {
  hostel: string | null;
  openTickets: number;
  occupancy: number | null;
  maintenance: number;
  lastUpdate?: string | null;
}

export interface HostelManagerStatusBarProps {
  counts: HostelManagerCounts | null;
  /** Whether a refresh is in progress. */
  refreshing?: boolean;
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "—";
    const secs = Math.round((Date.now() - then) / 1000);
    if (secs < 60) return "just now";
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  } catch {
    return "—";
  }
}

export function HostelManagerStatusBar({ counts, refreshing = false }: HostelManagerStatusBarProps) {
  const hostel = counts?.hostel;

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Hostel Manager status bar"
    >
      {/* Left: hostel · open tickets · occupancy · maintenance · last update */}
      <div className="flex items-center gap-4 min-w-0 overflow-x-auto custom-scrollbar">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">Hostel</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {hostel ?? "—"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          open
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.openTickets ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
          <Users className="w-3.5 h-3.5 shrink-0" />
          occupancy
          <span className="font-mono tabular-nums font-bold text-emerald-400">
            {counts?.occupancy ?? "—"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          maintenance
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {counts?.maintenance ?? 0}
          </span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
          last update
          <span className="font-mono tabular-nums text-[var(--text-secondary)]">
            {fmtRelative(counts?.lastUpdate)}
          </span>
        </span>
      </div>

      {/* Right: refresh indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {refreshing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
        ) : null}
        {counts?.lastUpdate ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">updated</span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}

export default HostelManagerStatusBar;
