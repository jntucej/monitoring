"use client";

/**
 * KanbanBoard — a three-column kanban surface for the HOD console.
 *
 * Fetches a board source endpoint (e.g. /api/permissions) via useApiResource,
 * groups the returned records into the configured columns (by `status`), and
 * renders each card with the ticket number, student name, workflow type, an
 * SLA badge, and the status. Mobile stacks columns vertically; desktop shows
 * three columns side by side. No charts, no KPI cards.
 */

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { type BoardRow } from "@/components/shared/Board";
import { type PermissionItem } from "@/components/approver/PermissionRow";
import { SlaBadge } from "@/components/approver/SlaBadge";

interface PermissionsResponse {
  success?: boolean;
  data: unknown;
  total?: number;
}

/** Narrow the dynamic itemKey array back to PermissionItem[] when it is
 *  present under `data` (e.g. /api/hostel-manager/summary nests tickets
 *  under `data.pendingTickets`). */
function nestedItemsOf(
  data: { data: unknown; [key: string]: unknown } | null,
  itemKey: string,
): PermissionItem[] | null {
  if (!data) return null;
  const nested = data.data;
  if (Array.isArray(nested)) return nested as PermissionItem[];
  if (nested && typeof nested === "object") {
    const dyn = (nested as Record<string, unknown>)[itemKey];
    if (Array.isArray(dyn)) return dyn as PermissionItem[];
  }
  const top = data[itemKey];
  if (Array.isArray(top)) return top as PermissionItem[];
  return null;
}

/** Convert a PermissionItem into a BoardRow-compatible shape for selection. */
function toBoardRow(item: PermissionItem): BoardRow {
  return {
    id: item.ticket_number,
    roll: item.student?.student_details?.roll ?? null,
    name: item.student?.name ?? null,
    person_type: item.student?.role ?? null,
    direction: item.status,
    reason: item.reason ?? null,
    gate_id: null,
    gate_name: null,
    timestamp: item.created_at,
    scan_type: item.workflow_type,
    is_correction: null,
    created_at: item.created_at ?? null,
  };
}

/** Per-column accent so a column reads at a glance. */
const COLUMN_ACCENT: Record<string, string> = {
  PENDING: "text-amber-500",
  APPROVED: "text-emerald-500",
  REJECTED: "text-rose-500",
};

export interface KanbanBoardProps {
  source: string;
  itemKey: string;
  columns: string[];
  onSelect: (row: BoardRow) => void;
}

export function KanbanBoard({ source, itemKey, columns, onSelect }: KanbanBoardProps) {
  const { data, loading, error } = useApiResource<PermissionsResponse>(source, { ttlMs: 15_000 });

  // /api/permissions puts the array directly under `data`; the summary
  // endpoints (e.g. /api/hostel-manager/summary) nest it under
  // `data.pendingTickets`. nestedItemsOf handles both, plus a top-level
  // dynamic itemKey fallback.
  const items = useMemo<PermissionItem[]>(() => nestedItemsOf(data as { data: unknown; [key: string]: unknown } | null, itemKey) ?? [], [data, itemKey]);

  const byColumn = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const col of columns) map[col] = [];
    for (const item of items) {
      const status = item.status;
      const col = columns.find((c) => c === status) ?? (map[status] ? status : null);
      if (col && map[col]) map[col].push(item);
    }
    // Newest-first within each column.
    for (const col of columns) {
      map[col].sort(
        (a, b) =>
          new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
          new Date(a.updated_at ?? a.created_at ?? 0).getTime(),
      );
    }
    return map;
  }, [items, columns]);

  return (
    <WidgetBoundary title="Kanban Board">
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading permissions&hellip;
        </div>
      ) : error ? (
        <div className="py-6 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No permission requests" description="Requests assigned to your queue will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1">
          {columns.map((col) => {
            const rows = byColumn[col] ?? [];
            const accent = COLUMN_ACCENT[col] ?? "text-[var(--text-secondary)]";
            return (
              <section
                key={col}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 flex flex-col min-h-0"
                aria-label={`${col} column`}
              >
                <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                  <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>{col}</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">{rows.length}</span>
                </header>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar max-h-[420px]">
                  {rows.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)] italic px-2 py-4 text-center">No {col.toLowerCase()} items</p>
                  ) : (
                    rows.map((item) => (
                      <button
                        key={item.id || item.ticket_number}
                        type="button"
                        onClick={() => onSelect(toBoardRow(item))}
                        className="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--action-primary)]/40 hover:bg-[var(--bg-base)] transition-colors p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-base)] border border-[var(--border)] text-[var(--action-primary)] truncate">
                            {item.ticket_number}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {item.workflow_type}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {item.student?.name || "Unknown Student"}
                        </p>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {item.student?.student_details?.roll || "—"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <SlaBadge slaDeadline={item.sla_deadline} status={item.status} />
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                item.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : item.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </WidgetBoundary>
  );
}

export default KanbanBoard;
