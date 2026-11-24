/**
 * shared/TaskRecordsList — standardized record list for role task surfaces.
 *
 * Replaces the "data wall" pattern where 5 role consoles rendered only
 * aggregate counters without the records themselves. Each record shows
 * ticket/identifier + status + created/SLA timestamps + optional action
 * label (e.g. "Send to OIE", "Review", "Assign").
 *
 * Records are typed loosely: every data-wall page fetches a different
 * shape; the component normalizes the fields it needs.
 */
"use client";

import { Inbox, Clock } from "lucide-react";

export interface TaskRecord {
  id: string;
  identifier: string;
  status?: string;
  created_at?: string;
  sla_deadline?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

function fmt(d?: string): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(s?: string) {
  const v = (s ?? "").toUpperCase();
  if (v === "PENDING") return "bg-amber-500/15 text-action-warning";
  if (v === "APPROVED" || v === "COMPLETED") return "bg-emerald-500/15 text-action-success";
  if (v === "REJECTED" || v === "CANCELLED") return "bg-rose-500/15 text-action-danger";
  return "bg-bg-elevated text-text-muted";
}

export function TaskRecordsList({
  title,
  records,
  emptyHint,
}: {
  title: string;
  records: TaskRecord[];
  emptyHint?: string;
}) {
  if (records.length === 0) {
    return (
      <div className="p-6 text-center min-w-0">
        <Inbox className="size-6 mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">No records.</p>
        {emptyHint && (
          <p className="text-xs text-text-muted mt-1">{emptyHint}</p>
        )}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-800 min-w-0">
      {records.map((r) => {
        const overdue = r.sla_deadline && new Date(r.sla_deadline).getTime() < Date.now();
        return (
          <li
            key={r.id}
            className={`px-4 py-3 flex flex-col gap-1 min-w-0 ${overdue ? "bg-rose-500/5" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-text-secondary">{r.identifier}</span>
              {r.status && (
                <span className={`surface-card inline-flex items-center px-2 py-0.5 text-xs ${statusTone(r.status)}`}>
                  {r.status}
                </span>
              )}
              {overdue && (
                <span className="surface-card inline-flex items-center bg-rose-500/15 text-action-danger px-2 py-0.5 text-xs font-semibold">
                  SLA EXCEEDED
                </span>
              )}
              {r.meta && <span className="text-xs text-text-muted">stage: {r.meta}</span>}
            </div>
            <p className="text-xs text-text-muted min-w-0">
              {fmt(r.created_at) ?? "—"}
              {r.sla_deadline ? ` · SLA: ${fmt(r.sla_deadline)}` : ""}
            </p>
            {r.actionLabel && (
              <button
                type="button"
                disabled={r.actionDisabled}
                onClick={r.onAction}
                className="surface-card mt-1 self-start px-2 py-1 text-xs text-action-info hover:bg-sky-500/10 disabled:opacity-50"
              >
                {r.actionLabel}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default TaskRecordsList;
