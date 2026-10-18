"use client";

/**
 * ChildActivityPanel — the caller's linked children + their latest activities.
 *
 * Desktop: a right-side panel (rendered by RoleConsole alongside the board).
 * Mobile: a full-width section below the board. No horizontal scroll.
 *
 * Reads GET /api/parents/me (the caller's own linked children, each with open
 * permission requests, most recent gate movement, and next upcoming campus
 * event). Per child it renders the latest activities: timestamp · type ·
 * summary. A child-activity "timeline" is simply this chronologically
 * ordered feed; the panel surfaces the newest-first movement log.
 */

import { useCallback, useMemo, useState } from "react";
import {
  Loader2,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Ticket,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";

/** A single child row from GET /api/parents/me. */
interface ChildActivityRow {
  childId: string;
  name: string | null;
  roll: string | null;
  openRequests: number;
  lastMovement: { direction: string; gate: string; at: string } | null;
  nextEvent: { title: string; startsAt: string } | null;
}

/** GET /api/parents/me response shape (self-scoped to the caller's children). */
interface ParentsMeResponse {
  success?: boolean;
  data: {
    children: ChildActivityRow[];
    totalOpenRequests: number;
  };
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChildActivityPanel() {
  const { data, loading, error, refresh } = useApiResource<ParentsMeResponse>(
    "/api/parents/me",
    { ttlMs: 30_000 }
  );

  const [busy, setBusy] = useState(false);

  const children = data?.data?.children ?? [];

  const handleRefresh = useCallback(() => {
    setBusy(true);
    void refresh().finally(() => setBusy(false));
  }, [refresh]);

  // Newest-movement-first ordering across all children (chronological feed).
  const ordered = useMemo(
    () =>
      [...children].sort((a, b) => {
        const ta = a.lastMovement?.at ? new Date(a.lastMovement.at).getTime() : 0;
        const tb = b.lastMovement?.at ? new Date(b.lastMovement.at).getTime() : 0;
        return tb - ta;
      }),
    [children]
  );

  const totalOpen = data?.data?.totalOpenRequests ?? 0;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            Child Activity
          </span>
          <span className="text-[11px] text-[var(--text-muted)] shrink-0">
            {children.length} {children.length === 1 ? "child" : "children"}
            {totalOpen > 0 ? ` · ${totalOpen} open request${totalOpen === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--action-primary)]/40 disabled:opacity-40 transition-colors"
          aria-label="Refresh child activity"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy || loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Body */}
      {loading && children.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading child activity&hellip;
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-200">
          <div className="flex items-center justify-between gap-3">
            <span>
              Could not load child activity: {error}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-3 py-4 text-[11px] text-[var(--text-muted)]">
          No linked children yet. Link a child to start tracking their campus activity.
        </div>
      ) : (
        <ul className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
          {ordered.map((child) => {
            const move = child.lastMovement;
            const isIn = move?.direction?.toUpperCase() === "IN";
            const movementSummary = move
              ? `${isIn ? "Checked in" : "Checked out"} at ${move.gate || "gate"} · ${fmtTime(move.at)}`
              : "No gate movement recorded yet";
            const activities: Array<{
              icon: React.ComponentType<{ className?: string }>;
              tone: string;
              label: string;
              detail: string;
            }> = [];
            if (move) {
              activities.push({
                icon: isIn ? ArrowDownLeft : ArrowUpRight,
                tone: isIn ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
                label: `${isIn ? "Entry" : "Exit"} · ${move.gate || "gate"}`,
                detail: fmtTime(move.at),
              });
            }
            if (child.openRequests > 0) {
              activities.push({
                icon: Ticket,
                tone: "bg-amber-500/15 text-amber-400",
                label: `${child.openRequests} open request${child.openRequests === 1 ? "" : "s"}`,
                detail: "pending approval",
              });
            }
            if (child.nextEvent) {
              activities.push({
                icon: CalendarClock,
                tone: "bg-sky-500/15 text-sky-400",
                label: `Upcoming · ${child.nextEvent.title || "campus event"}`,
                detail: fmtTime(child.nextEvent.startsAt),
              });
            }
            return (
              <li
                key={child.childId}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 min-w-0"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {child.name || "Unnamed child"}
                  </p>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                    {child.roll || "—"}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] mb-2">{movementSummary}</p>

                {activities.length > 0 ? (
                  <ol className="space-y-1">
                    {activities.map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <li key={i} className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${a.tone}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="flex-1 min-w-0 text-[11px] font-semibold text-[var(--text-primary)] truncate">
                            {a.label}
                          </span>
                          <time className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums shrink-0">
                            {a.detail}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    No recent activity
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ChildActivityPanel;
