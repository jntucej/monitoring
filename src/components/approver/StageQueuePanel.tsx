"use client";
// src/components/approver/StageQueuePanel.tsx
// SCAFFOLD:QUEUE — stage-aware queue with read-only cross-stage visibility.
//
// Behaviour:
//   • Rows whose current_stage === myStage && status === "PENDING" → action buttons
//   • Rows in any other chain stage → read-only "View only" badge
//   • Rows outside the chain → hidden entirely (never rendered)
//   • Uses useDashboardData (single fetch, cache + polling, refreshKey)
//   • Structured error codes via apiErrors (repo envelope { success, error:{code} })
//   • WidgetBoundary keyed on refreshKey → no stale rows after an action
//
// The root cause of "not allowed to act at stage X": the old list rendered
// Approve/Reject on every row it received, and the API only returned rows for
// the caller's own stage — so a stale cached payload (or an undated
// initialPermissions prop) showed buttons that the server then rejected with
// FORBIDDEN. Buttons are now derived from the row itself, never from the feed.

import { useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { friendlyApiError, readApiError } from "@/lib/apiErrors";
import { getAuthHeaders } from "@/lib/utils";
import { POLL_INTERVALS } from "@/config/app-constants";
import { Check, Eye, Loader2, RefreshCw, X } from "lucide-react";

/** Row shape shared by every queue feed (mirrors /api/permissions). */
export interface StageQueueRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    id?: string;
    name?: string | null;
    student_details?: { roll?: string | null; hostel_block?: string | null } | null;
  } | null;
  [k: string]: unknown;
}

export type QueueAction = "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE";

export interface StageQueuePanelProps {
  /** Route returning { success, data: StageQueueRow[], total? }. */
  url: string;
  /** The stage THIS actor is authorized to act at. */
  myStage: string;
  /** Every stage in the workflow chain (for read-only visibility). */
  chain: string[];
  /** Called when an action button is pressed. Must throw on failure. */
  onAction?: (row: StageQueueRow, action: QueueAction, comment: string) => Promise<void>;
  title?: string;
  /** Render the FORWARD / ESCALATE secondary actions (default true). */
  allowForward?: boolean;
  pollMs?: number;
  ttlMs?: number;
}

/** PATCH /api/permissions/[ticket] is the single write surface for the workflow. */
export async function actOnTicket(
  ticket: string,
  action: QueueAction,
  comment = ""
): Promise<void> {
  const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action, comment: comment.trim() || undefined }),
  });
  if (!res.ok) {
    const { code, message } = await readApiError(res);
    // Surface the exact stage/state reason instead of a blank banner.
    throw new Error(friendlyApiError(code, message));
  }
  const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (body && body.success === false) {
    throw new Error(friendlyApiError(undefined, "Action was not accepted."));
  }
}

export function StageQueuePanel({
  url,
  myStage,
  chain,
  onAction,
  title = "Queue",
  allowForward = true,
  pollMs = POLL_INTERVALS.normal,
  ttlMs = 5_000,
}: StageQueuePanelProps) {
  const { data, loading, error, refresh, refreshKey } = useDashboardData<{
    success: boolean;
    data: StageQueueRow[];
    total?: number;
  }>(url, { ttlMs, pollMs });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = data?.data ?? [];

  // A row is actionable only when the server's own state says the caller is
  // the owner of this stage AND it is still pending. Everything else renders
  // read-only — so a 403 is structurally impossible from this component.
  const canAct = useCallback(
    (row: StageQueueRow) =>
      row.current_stage === myStage && row.status === "PENDING" && Boolean(onAction),
    [myStage, onAction],
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => chain.includes(r.current_stage)),
    [rows, chain],
  );

  const handle = useCallback(
    async (row: StageQueueRow, action: QueueAction) => {
      if (!onAction) return;
      setBusyId(row.ticket_number);
      setActionError(null);
      try {
        await onAction(row, action, "");
        await refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [onAction, refresh],
  );

  const retry = useCallback(() => {
    setActionError(null);
    void refresh();
  }, [refresh]);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          aria-label="Refresh queue"
          title="Refresh queue"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-[var(--action-danger)]/40 bg-[var(--action-danger)]/10 p-2 text-xs text-[var(--action-danger)]"
        >
          {error}
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-[var(--action-warning)]/40 bg-[var(--action-warning)]/10 p-2 text-xs text-[var(--action-warning)]"
        >
          {actionError}
        </div>
      )}

      {visibleRows.length === 0 && !loading ? (
        <EmptyState
          title="No items in this queue"
          description="Anything pending at your stage will appear here."
        />
      ) : (
        <WidgetBoundary key={refreshKey} title={`${title} list`}>
          <ul className="divide-y divide-[var(--border)]">
            {visibleRows.map((row) => {
              const actionable = canAct(row);
              const busy = busyId === row.ticket_number;
              return (
                <li key={row.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-[var(--text-muted)]">
                      {row.ticket_number}
                    </div>
                    <div className="truncate text-sm text-[var(--text-primary)]">
                      {row.student?.name ?? "—"}
                      {row.student?.student_details?.roll
                        ? ` · ${row.student.student_details.roll}`
                        : ""}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Stage: {row.current_stage}
                      {!actionable ? " · view only" : ""}
                    </div>
                  </div>

                  {actionable ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handle(row, "APPROVE")}
                        className="rounded-md bg-[var(--action-primary)] px-2 py-1 text-xs text-white disabled:opacity-50"
                        aria-label={`Approve ${row.ticket_number}`}
                        title="Approve"
                      >
                        {busy ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-3 w-3" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handle(row, "REJECT")}
                        className="rounded-md bg-[var(--action-danger)] px-2 py-1 text-xs text-white disabled:opacity-50"
                        aria-label={`Reject ${row.ticket_number}`}
                        title="Reject"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                      {allowForward && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handle(row, "FORWARD")}
                          className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                          aria-label={`Forward ${row.ticket_number}`}
                          title="Forward to next stage"
                        >
                          Forward
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
                      <Eye className="h-3 w-3" aria-hidden /> View only
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </WidgetBoundary>
      )}
    </section>
  );
}

export default StageQueuePanel;
