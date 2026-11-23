"use client";

import { Suspense, useCallback, useMemo, useState } from "react";

import { PageLoading } from "@/components/shared/LoadingStates";
import {
  Loader2,
  Inbox,
  AlertTriangle,
  Ticket,
  Search
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  buildGuardianChildRequestInspection,
  type GuardianChildRequestRecord,
} from "@/lib/role-registers/guardianInspections";
import { SelfActionLoop, type NextActionStep } from "@/components/nav/level0/SelfActionLoop";
import {
  KVPairs,
  Timeline,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/**
 * Build an EntityInspection for a permission ticket (guardian view).
 * Sections: overview → stage history → actions (guardian can only view,
 * cannot approve — the approval chain is the campus office's job).
 */
function buildChildTicketInspection(r: PermissionRow): EntityInspection {
  const ticketNum = r.ticket_number ?? r.id.slice(0, 8);
  const statusTone: "ok" | "warn" | "danger" | "neutral" =
    (r.status ?? "").toUpperCase() === "APPROVED" || (r.status ?? "").toUpperCase() === "COMPLETED" ? "ok"
    : (r.status ?? "").toUpperCase() === "REJECTED" ? "danger"
    : "warn";

  const historyItems = (r.stage_history ?? []).map((h) => ({
    label: `${h.actorName} ${h.action.toLowerCase()}`,
    time: h.timestamp ? new Date(h.timestamp).toLocaleString() : undefined,
    detail: h.comment ?? undefined,
    tone: "neutral" as const,
  }));

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Ward", value: r.student?.name ?? "—" },
            { label: "Roll", value: r.student?.student_details?.roll ?? "—" },
            { label: "Workflow", value: (r.workflow_type ?? "").replace(/_/g, " ") },
            { label: "Current stage", value: r.current_stage?.replace(/_/g, " ") ?? "—" },
            { label: "Created", value: r.created_at ? new Date(r.created_at).toLocaleString() : "—" },
            { label: "SLA", value: r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : "—" },
          ]}
        />
      ),
    },
  ];

  if (historyItems.length > 0) {
    sections.push({
      title: "Stage history",
      collapsible: true,
      content: <Timeline items={historyItems} />,
    });
  }

  // Guardian can view the full request status but cannot approve/reject
  sections.push({
    title: "Actions",
    content: (
      <ActionRow>
        <InspectorButton href="/guardian/request-status" variant="primary">
          View request status
        </InspectorButton>
      </ActionRow>
    ),
  });

  return {
    kind: "permission_ticket",
    title: ticketNum,
    subtitle: `${r.student?.name ?? "Unknown ward"} · ${r.workflow_type ?? ""}`.trim() || null,
    status: <StatusBadge text={r.status ?? "PENDING"} tone={statusTone} />,
    sections,
    detailHref: "/guardian/request-status",
    detailLabel: "All requests",
  };
}


/* ── shapes ── */

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  student_user_id?: string | null;
  current_stage?: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
  stage_history?: Array<{ actorName: string; actorRole: string; action: string; comment?: string | null; timestamp: string }>;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── helpers ── */

function statusBadge(status?: string) {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "border-emerald-400/30 bg-emerald-400/10 text-action-success";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-action-danger";
  if (s === "PENDING")
    return "border-amber-400/30 bg-amber-400/10 text-action-warning";
  return "border-border/30 bg-bg-elevated/10 text-text-muted";
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-card bg-bg-base/60 p-8 text-center text-sm text-text-muted">
      <Inbox className="w-6 h-6 mx-auto mb-2 text-text-muted" />
      <p>{message}</p>
    </div>
  );
}

/* ── main ── */

function ChildRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";
  const { inspection, inspect, closeInspection } = useEntityInspector();
  // Level-0 record pivot: the ward context currently in focus. Set when a
  // request row is inspected so the next-step links carry ?ward=<id>.
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  // /api/permissions?status=PENDING — the server auto-scopes to the
  // guardian's linked wards (parent/guardian branch in the route handler).
  const {
    data: perms,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionListData>("/api/permissions?status=PENDING", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const refreshAll = useCallback(async () => {
    clearCache("/api/permissions?status=PENDING");
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!userId });

  const rows = useMemo<PermissionRow[]>(() => {
    const r = perms?.data;
    return Array.isArray(r) ? r : [];
  }, [perms]);

  const pending = rows.filter((r) => (r.status ?? "PENDING").toUpperCase() === "PENDING");
  const total = perms?.total ?? rows.length;

  // Level-0 ward pivot: the focused request's ward (roll) drives the steps.
  const focusedRow = selectedTicket
    ? rows.find((r) => (r.ticket_number ?? r.id) === selectedTicket) ?? null
    : null;
  const focusedRoll =
    focusedRow?.student?.student_details?.roll ??
    (focusedRow?.student_user_id ? String(focusedRow.student_user_id) : "");
  const wardSteps: NextActionStep[] = focusedRoll
    ? [
        { label: "Movement Detail", href: `/guardian/movement-info?ward=${encodeURIComponent(focusedRoll)}` },
        { label: "Request Status", href: `/guardian/request-status?ward=${encodeURIComponent(focusedRoll)}` },
        { label: "Child Profile", href: `/guardian/child-status?ward=${encodeURIComponent(focusedRoll)}` },
      ]
    : [];

  const openInspector = (r: PermissionRow) => {
    const ticket = r.ticket_number ?? r.id;
    setSelectedTicket(ticket);
    inspect(buildGuardianChildRequestInspection(r as GuardianChildRequestRecord));
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-action-success" />
            Child Requests
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Pending pass and leave requests from your wards
          </p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-rose-500/10 p-3 text-sm text-rose-600 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="surface-card inline-flex items-center gap-1.5 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="surface-card bg-bg-surface p-6 flex items-center gap-3 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No pending requests from your wards. The queue is clear." />
      ) : (
        <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
          <div className="surface-card px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Pending Requests
            </h2>
            <span className="text-xs text-text-muted">
              {total > 0 ? `${total} total` : "queue clear"}
            </span>
          </div>
          {/* Mobile list view */}
          <ul className="space-y-2 md:hidden p-3">
            {rows.slice(0, 20).map((r) => {
              const ticket = r.ticket_number || r.id.slice(0, 8);
              const ward = r.student?.name || "—";
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openInspector(r)}
                    aria-label={`Inspect request ${ticket} for ${ward}`}
                    className="surface-card block w-full bg-bg-surface p-3 text-left hover:bg-bg-base/40 focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded transition-colors motion-reduce:transition-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-white">{ticket}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${statusBadge(r.status)}`}>
                        {r.status || "PENDING"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-primary font-medium truncate">{ward}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                      <span className="capitalize">{(r.workflow_type ?? "").replace(/_/g, " ")}</span>
                      <span>{r.current_stage || "—"}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Ticket</th>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Workflow</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">SLA</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.slice(0, 20).map((r) => {
                  const slaBreached = r.sla_deadline
                    ? new Date(r.sla_deadline).getTime() < Date.now()
                    : false;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openInspector(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openInspector(r);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect request ${r.ticket_number || r.id.slice(0, 8)}`}
                      className="hover:bg-bg-base/40 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-inset"
                    >
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {r.ticket_number || r.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll
                          ? ` · ${r.student.student_details.roll}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-text-secondary capitalize whitespace-nowrap">
                        {(r.workflow_type ?? "").replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {r.current_stage || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.sla_deadline ? (
                          slaBreached ? (
                            <span className="text-action-danger">
                              Breached ·{" "}
                              {new Date(r.sla_deadline).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-text-muted">
                              {new Date(r.sla_deadline).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusBadge(r.status)}`}
                        >
                          {r.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <p className="text-xs text-text-muted flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5 text-action-warning" />
          {pending.length} request(s) currently pending. Approval actions are available on the full
          permissions flow at the campus office.
        </p>
      )}

      {/* Level-0 record pivot: the selected ward/record's next-step actions,
          carrying ward context via ?ward=<id>. */}
      {selectedTicket && focusedRoll && (
        <SelfActionLoop
          title={`Request ${selectedTicket}`}
          meta={`Ward ${focusedRoll} — where to take it next`}
          steps={wardSteps}
        />
      )}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
export default function ChildRequestsPage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ChildRequestsInner />
      </Suspense>
    </AuthGuard>
  );
}
