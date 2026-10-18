"use client";

/**
 * GridBoard — a multi-column grid board for a role console.
 *
 * Fetches a summary endpoint (e.g. /api/caretaker/summary) via
 * useApiResource, groups the returned ticket rows into columns by their
 * normalized status, and renders each card with the ticket number,
 * student/facility name, workflow type, an SLA badge, and the status.
 *
 * Desktop shows three columns side by side; mobile stacks columns
 * vertically. No horizontal scroll. No KPI cards or charts.
 */

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { type BoardRow } from "@/components/shared/Board";
import { SlaBadge } from "@/components/approver/SlaBadge";

/** The shape a grid-board source endpoint must return. */
interface GridBoardResponse {
  success?: boolean;
  data: {
    [key: string]: unknown;
    pendingTickets?: GridTicket[];
  };
}

/** A single ticket row as returned by a grid-board source. */
export interface GridTicket {
  ticket_number: string;
  workflow_type: string;
  status: string;
  sla_deadline: string | null;
  student_name: string | null;
}

/**
 * Normalize a raw ticket status into one of the three grid columns.
 * PENDING / ESCALATED → "Open"; IN_PROGRESS → "In Progress";
 * APPROVED / RESOLVED / REJECTED → "Resolved"; anything else → "Open".
 */
export function normalizeGridColumn(status: string | null | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "IN_PROGRESS":
      return "In Progress";
    case "APPROVED":
    case "RESOLVED":
    case "REJECTED":
      return "Resolved";
    case "PENDING":
    case "ESCALATED":
    default:
      return "Open";
  }
}

/** Convert a GridTicket into a BoardRow-compatible shape for selection. */
export function ticketToBoardRow(ticket: GridTicket): BoardRow {
  return {
    id: ticket.ticket_number,
    roll: null,
    name: ticket.student_name,
    person_type: null,
    direction: ticket.status,
    reason: null,
    gate_id: null,
    gate_name: null,
    timestamp: ticket.sla_deadline ?? "",
    scan_type: ticket.workflow_type,
    is_correction: null,
    created_at: null,
  };
}

const COLUMN_TITLES = ["Open", "In Progress", "Resolved"];

interface GridBoardProps {
  /** The summary API path, e.g. "/api/caretaker/summary". */
  source: string;
  /** Field to group rows by; the caretaker summary groups by "status". */
  groupBy: string;
  /** Explicit column titles; falls back to the three status columns. */
  columns: string[];
  /** Called when a card is selected. */
  onSelect?: (row: BoardRow) => void;
}

export function GridBoard({ source, groupBy, columns, onSelect }: GridBoardProps) {
  const { data, loading, error } = useApiResource<GridBoardResponse>(source, { ttlMs: 15_000 });

  // The caretaker summary returns tickets under data.pendingTickets.
  // Fall back to the dynamic groupBy field, then to an empty array.
  const tickets = useMemo<GridTicket[]>(() => {
    if (!data) return [];
    const raw = data.data;
    if (Array.isArray(raw.pendingTickets)) return raw.pendingTickets;
    const dyn = raw[groupBy];
    if (Array.isArray(dyn)) return dyn as GridTicket[];
    return [];
  }, [data, groupBy]);

  const byColumn = useMemo(() => {
    const map: Record<string, GridTicket[]> = {};
    for (const col of columns) map[col] = [];
    for (const t of tickets) {
      const col = normalizeGridColumn(t.status);
      if (map[col]) map[col].push(t);
    }
    return map;
  }, [tickets, columns]);

  const empty = tickets.length === 0;

  return (
    <WidgetBoundary title="Tickets by status">
      {loading && empty ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading tickets&hellip;
        </div>
      ) : error ? (
        <div className="py-6 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          {error}
        </div>
      ) : empty ? (
        <EmptyState
          title="No pending tickets"
          description="Tickets at the caretaker stage will appear here grouped by status."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTickets = byColumn[col] ?? [];
            return (
              <section
                key={col}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 min-w-0"
                aria-label={`${col} tickets`}
              >
                <header className="flex items-center justify-between px-1 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {col}
                  </h3>
                  <span className="text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
                    {colTickets.length}
                  </span>
                </header>
                <ul className="space-y-2">
                  {colTickets.length === 0 ? (
                    <li className="px-1 py-3 text-[11px] text-[var(--text-muted)]">
                      No tickets
                    </li>
                  ) : (
                    colTickets.map((t) => (
                      <li key={t.ticket_number}>
                        <button
                          type="button"
                          onClick={() => onSelect?.(ticketToBoardRow(t))}
                          className="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-3 min-w-0 hover:border-[var(--action-primary)]/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)] truncate">
                              {t.ticket_number}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate mt-1">
                            {t.student_name || "—"}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {t.workflow_type}
                          </p>
                          <div className="mt-2">
                            <SlaBadge slaDeadline={t.sla_deadline} status={t.status} />
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {/* Unused COLUMN_TITLES is referenced only as a default in the page;
          keep the export for consumers that want the canonical titles. */}
    </WidgetBoundary>
  );
}

export { COLUMN_TITLES };
export default GridBoard;
