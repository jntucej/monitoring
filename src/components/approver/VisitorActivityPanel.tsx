"use client";

/**
 * VisitorActivityPanel — visitor visit-activity side panel for the visitor
 * console.
 *
 * Desktop: right-side panel (rendered by RoleConsole alongside the board).
 * Mobile: full-width section below the board. No horizontal scroll.
 *
 * Reads GET /api/visitors/mine — the self-scoped feed of the calling
 * visitor's own visitor_logs rows (scoped by the caller's user_id
 * server-side, so no hostel/branch filter is applied). Lists the most
 * recent visit activities with type, status, and timestamp.
 */

import { useMemo, useCallback } from "react";
import { Radio, Clock, Loader2, CheckCircle, XCircle, DoorOpen, FileClock } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";

interface VisitorLogRow {
  id: string;
  status: string;
  purpose: string | null;
  check_in_at: string;
  check_out_at: string | null;
  expires_at?: string | null;
}

interface VisitorsMineResponse {
  success?: boolean;
  data: {
    logs: VisitorLogRow[];
    active: { status: string; log: VisitorLogRow } | null;
    lastCompleted: VisitorLogRow | null;
  };
}

/** Derive a short human-readable "type" label for a visitor log row. */
function activityType(row: VisitorLogRow): string {
  if (row.status === "active" && !row.check_out_at) return "CHECK-IN";
  if (row.check_out_at) return "CHECK-OUT";
  if (row.status === "active") return "IN VISIT";
  return "VISIT LOG";
}

/** Derive a compact status label + tone for a visitor log row. */
function statusOf(row: VisitorLogRow): { label: string; tone: string } {
  const s = (row.status ?? "").toUpperCase();
  if (row.status === "active" && !row.check_out_at)
    return { label: "ACTIVE", tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  if (row.check_out_at)
    return { label: "COMPLETED", tone: "text-sky-400 bg-sky-400/10 border-sky-400/20" };
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED")
    return { label: s, tone: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  return { label: s || "UNKNOWN", tone: "text-[var(--text-muted)] bg-[var(--bg-base)] border-[var(--border)]" };
}

interface VisitorActivityPanelProps {
  /** Optional refresh callback; called when the panel's fetch completes. */
  onRefresh?: () => void;
}

export function VisitorActivityPanel({ onRefresh }: VisitorActivityPanelProps) {
  const { data, loading, refresh } = useApiResource<VisitorsMineResponse>(
    "/api/visitors/mine",
    { ttlMs: 15_000 }
  );

  const logs = useMemo<VisitorLogRow[]>(() => {
    const rows = data?.data?.logs ?? [];
    // Newest first, by check_in_at (or id as a fallback key).
    return [...rows].sort(
      (a, b) =>
        new Date(b.check_in_at ?? 0).getTime() -
        new Date(a.check_in_at ?? 0).getTime()
    );
  }, [data]);

  const handleRefresh = useCallback(() => {
    void refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString([], {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  };

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0"
      aria-label="Visitor activity panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            My Visit Activity
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh my visit activity"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Radio className="w-3 h-3" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Body */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading your visit activity…</span>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No visit activity yet"
          description="Your visit check-in / check-out history will appear here once a visit is logged."
          icon={<FileClock className="w-6 h-6" />}
        />
      ) : (
        <ul className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {logs.slice(0, 15).map((row) => {
            const status = statusOf(row);
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold border shrink-0 ${status.tone}`}
                    >
                      {row.check_out_at ? (
                        <XCircle className="w-2.5 h-2.5" />
                      ) : (
                        <CheckCircle className="w-2.5 h-2.5" />
                      )}
                      {status.label}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {activityType(row)}
                    </span>
                  </div>
                  {row.purpose ? (
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                      {row.purpose}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
                  {row.check_out_at ? (
                    <DoorOpen className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {fmt(row.check_in_at)}
                  {row.check_out_at ? ` → ${fmt(row.check_out_at)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer hint */}
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Shows the last 20 of your own visit logs. Click a row in the board for
        full context.
      </p>
    </section>
  );
}

export default VisitorActivityPanel;
