"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { DecisionItemCard } from "@/components/shared/DecisionItemCard";
import { clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";

interface PermissionRow {
  id: string;
  ticket_number?: string;
  ticketNumber?: string;
  student_name?: string;
  studentName?: string;
  roll_number?: string;
  rollNumber?: string;
  workflow_type?: string;
  workflowType?: string;
  current_stage?: string;
  currentStage?: string;
  status?: string;
  reason?: string;
  sla_deadline?: string;
  slaDeadline?: string;
  campus_status?: string;
  campusStatus?: string;
  departure_at?: string;
  departureAt?: string;
}

interface ActiveAlert {
  id: string;
  title?: string;
  severity?: string;
  category?: string;
}

export interface ApproverDecisionQueueProps {
  roleLabel: string;
  forwardLabel?: string;
  relatedHref?: string;
  relatedLabel?: string;
  detailBaseHref?: string;
}

function formatSlaRemaining(deadline?: string): string {
  if (!deadline) return "SLA: Standard";
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return "SLA: Standard";
  if (ms <= 0) return "SLA Overdue";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `SLA: ${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `SLA: ${hrs}h ${rem}m left`;
}

export function ApproverDecisionQueue({
  roleLabel,
  forwardLabel = "Forward to Next Stage",
  relatedHref,
  relatedLabel = "Related Oversight",
  detailBaseHref = "/permissions",
}: ApproverDecisionQueueProps) {
  const [items, setItems] = useState<PermissionRow[]>([]);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTicket, setBusyTicket] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"APPROVE" | "FORWARD" | "REJECT" | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [permRes, alertRes] = await Promise.all([
        fetch("/api/permissions?status=PENDING&limit=12", {
          headers: getAuthHeaders(),
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/alerts?status=ACTIVE&limit=5", {
          headers: getAuthHeaders(),
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
      ]);

      if (permRes.status === 401 || permRes.status === 403) {
        setError(`Your ${roleLabel} session does not have permission to view this queue.`);
        setItems([]);
        return;
      }
      if (permRes.status === 429) {
        setError("Too many requests right now. Please wait a moment and refresh.");
        return;
      }
      if (!permRes.ok) {
        setError("Unable to load pending approvals right now.");
        return;
      }

      const permJson = await permRes.json().catch(() => ({}));
      const rows: PermissionRow[] = Array.isArray(permJson?.data)
        ? permJson.data
        : Array.isArray(permJson?.permissions)
          ? permJson.permissions
          : [];
      setItems(rows);

      if (alertRes && alertRes.ok) {
        const alertJson = await alertRes.json().catch(() => ({}));
        const alertRows: ActiveAlert[] = Array.isArray(alertJson?.data)
          ? alertJson.data
          : Array.isArray(alertJson?.alerts)
            ? alertJson.alerts
            : [];
        setAlerts(alertRows);
      }
    } catch {
      setError("Network error while loading pending approvals.");
    } finally {
      setLoading(false);
    }
  }, [roleLabel]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  usePolling(loadQueue, { intervalMs: 30_000, enabled: true });

  const handleDecide = async (
    ticket: string,
    action: "APPROVE" | "FORWARD" | "REJECT",
    reason?: string,
  ) => {
    setBusyTicket(ticket);
    setBusyAction(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ action, comment: reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setFeedback(json?.error?.message || `Could not ${action.toLowerCase()} ${ticket}.`);
        return;
      }

      setItems((prev) =>
        prev.filter((r) => (r.ticket_number ?? r.ticketNumber ?? r.id) !== ticket),
      );
      setSelectedTickets((prev) => prev.filter((t) => t !== ticket));
      clearCache();
      if (action === "APPROVE") {
        setFeedback(`Ticket ${ticket} approved — pass/stage updated.`);
      } else if (action === "FORWARD") {
        setFeedback(`Ticket ${ticket} forwarded to the next approval stage.`);
      } else {
        setFeedback(`Ticket ${ticket} rejected with reason.`);
      }
    } catch {
      setFeedback(`Network error while updating ${ticket}.`);
    } finally {
      setBusyTicket(null);
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Inline Approval Decision Queue">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Pending Decisions ({items.length})
          </h2>
          <p className="text-xs text-text-muted">
            Approve, forward, or reject with reason directly from this queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {relatedHref && (
            <Link
              href={relatedHref}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              {relatedLabel}
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => void loadQueue()}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="surface-card flex items-center gap-2.5 bg-bg-surface px-4 py-2.5 text-xs text-action-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {alerts.length} active campus alert{alerts.length > 1 ? "s" : ""}:{" "}
            {alerts[0]?.title ?? "Curfew / gate alert active"}
          </span>
        </div>
      )}

      {feedback && (
        <div className="surface-card flex items-center gap-2 bg-bg-surface px-4 py-2.5 text-xs font-medium text-action-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {selectedTickets.length > 0 && (
        <div className="surface-card flex flex-wrap items-center justify-between gap-2 bg-bg-surface px-4 py-2.5 text-xs">
          <span className="font-semibold text-text-primary">
            {selectedTickets.length} ticket{selectedTickets.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={async () => {
                setBulkBusy(true);
                setFeedback(null);
                try {
                  const res = await fetch("/api/permissions/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    credentials: "include",
                    body: JSON.stringify({ tickets: selectedTickets, action: "APPROVE" }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (res.ok && json?.success !== false) {
                    setItems((prev) =>
                      prev.filter((r) => !selectedTickets.includes(r.ticket_number ?? r.ticketNumber ?? r.id)),
                    );
                    setFeedback(`Bulk approved ${selectedTickets.length} ticket(s).`);
                    setSelectedTickets([]);
                    clearCache();
                  } else {
                    setFeedback(json?.error?.message || "Bulk approve failed.");
                  }
                } finally {
                  setBulkBusy(false);
                }
              }}
              className="min-h-11 rounded-lg bg-action-primary px-3 py-1.5 font-semibold text-white disabled:opacity-50"
            >
              {bulkBusy ? "Applying…" : "Bulk Approve"}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setSelectedTickets([])}
              className="min-h-11 rounded-lg bg-bg-elevated px-3 py-1.5 font-medium text-text-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="surface-card bg-bg-surface p-4 text-xs text-action-danger">
          {error}
        </div>
      ) : loading && items.length === 0 ? (
        <div className="surface-card bg-bg-surface p-6 text-xs text-text-muted">
          Loading pending decisions…
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card bg-bg-surface p-6 text-xs text-text-muted">
          No pending requests in your {roleLabel} queue right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((row) => {
            const ticket = row.ticket_number ?? row.ticketNumber ?? row.id;
            const student = row.student_name ?? row.studentName ?? "Student";
            const roll = row.roll_number ?? row.rollNumber ?? "—";
            const wf = row.workflow_type ?? row.workflowType ?? "Permission";
            const stage = row.current_stage ?? row.currentStage ?? "Pending";
            const campus = row.campus_status ?? row.campusStatus ?? "Campus status unknown";
            const sla = formatSlaRemaining(row.sla_deadline ?? row.slaDeadline);
            const reason = row.reason?.trim() || "No reason text provided.";

            return (
              <div key={ticket} className="space-y-1.5">
                <DecisionItemCard
                  title={`${student} (${roll}) · ${ticket}`}
                  subtitle={`${wf} · Stage: ${stage} · ${campus}`}
                  contextBadge={sla}
                  whyItNeedsAction={reason}
                  busyAction={busyTicket === ticket ? busyAction : null}
                  decisions={[
                    { action: "APPROVE", label: "Approve", tone: "primary" },
                    { action: "FORWARD", label: forwardLabel, tone: "secondary" },
                    { action: "REJECT", label: "Reject", tone: "danger", requiresReason: true },
                  ]}
                  onDecide={(act, comment) => handleDecide(ticket, act, comment)}
                />
                <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-text-muted">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTickets.includes(ticket)}
                      onChange={(e) =>
                        setSelectedTickets((prev) =>
                          e.target.checked ? [...prev, ticket] : prev.filter((t) => t !== ticket),
                        )
                      }
                      aria-label={`Select ${ticket} for bulk action`}
                    />
                    <span>Select</span>
                  </label>
                  <div className="flex items-center gap-3">
                  <Link
                    href={`${detailBaseHref}/${encodeURIComponent(ticket)}`}
                    className="hover:text-action-primary inline-flex items-center gap-1"
                  >
                    Open full timeline <ArrowUpRight className="size-3" />
                  </Link>
                  {relatedHref && (
                    <Link
                      href={`${relatedHref}?ticket=${encodeURIComponent(ticket)}`}
                      className="hover:text-action-primary inline-flex items-center gap-1"
                    >
                      {relatedLabel} <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ApproverDecisionQueue;
