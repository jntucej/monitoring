"use client";

/**
 * CaretakerStatusBar — bottom status strip for the caretaker console.
 *
 * Mirrors the PermissionStatusBar visual style (footer, border-t,
 * bg-surface/95 backdrop-blur, text-[11px], select-none). The parent
 * (RoleConsole) computes the counts from the fetched caretaker summary
 * response and passes them in; the hostel is derived from the caller's
 * assigned_hostel (via useAuthStore) and passed in as `counts.hostel`.
 */

import { Clock, Loader2, Building2 } from "lucide-react";

export interface CaretakerCounts {
  hostel: string | null;
  open: number;
  urgent: number;
  lastUpdate?: string | null;
}

export interface CaretakerStatusBarProps {
  counts: CaretakerCounts | null;
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

export function CaretakerStatusBar({ counts, refreshing = false }: CaretakerStatusBarProps) {
  const hostel = counts?.hostel;

  return (
    <footer
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Caretaker status bar"
    >
      {/* Left: hostel · open · urgent · last update */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">Hostel</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
            {hostel ?? "—"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          open
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {counts?.open ?? 0}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
          urgent
          <span className="font-mono tabular-nums font-bold text-rose-400">
            {counts?.urgent ?? 0}
          </span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
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

export default CaretakerStatusBar;
