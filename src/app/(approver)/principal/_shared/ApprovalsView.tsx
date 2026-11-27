"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiResource, invalidateApiCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { PrincipalEmptyReconciler } from "@/components/nav/level3/PrincipalRecordHub";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { ActionFirstApprovalsWorkspace } from "@/components/nav/ActionFirstApprovalsWorkspace";
import { RoleExportButton } from "@/components/shared/RoleExportButton";
import { ActiveFilterBar } from "@/components/shared/ActiveFilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector, KVPairs } from "@/components/shared/EntityInspector";
import { useRoleContext } from "@/hooks/useRoleContext";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildApprovalInspection,
  type ApprovalRecord,
  type RoleGate,
} from "./entityInspectionModels";

const DecisionHistoryPanel = lazy(
  () => import("@/components/approver/DecisionHistoryPanel")
);

interface PermissionsResponse {
  success: boolean;
  data: PermissionItem[];
  total?: number;
}
export function ApprovalsView({
  status,
  title,
  workflowType,
}: {
  status: "PENDING" | "ESCALATED" | "OVERDUE" | "DELEGATED";
  title: string;
  /** Restrict the register to one workflow type (KPI drilldowns arrive via ?workflowType=). */
  workflowType?: string;
}) {
  const [selected, setSelected] = useState<PermissionItem | null>(null);
  /**
   * The ?ticket= deep-link target. When the register's status filter does
   * not contain the ticket (a decided ticket deep-linked into the pending
   * register, an escalated ticket into the pending register, etc.), the
   * ticket is fetched directly from /api/permissions by id so the inspector
   * still opens on it. The register state (filters, scroll) stays intact.
   */
  const [deepTicket, setDeepTicket] = useState<PermissionItem | null>(null);

  // ?ticket= deep link (retention widgets / notification emails open a specific
  // ticket's inspector on the matching view).
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const openTicket = (rows: PermissionItem[]) => {
    if (ticketParam) {
      const hit = rows.find((r) => r.ticket_number === ticketParam);
      if (hit) {
        setSelected(hit);
      } else {
        // The ticket is not in this status-filtered register. Fetch it
        // directly so the deep link still lands on the right entity.
        void (async () => {
          try {
            const res = await fetch(
              `/api/permissions?limit=500&ticket=${encodeURIComponent(ticketParam)}`,
              { headers: getAuthHeaders() }
            );
            const json = await res.json().catch(() => null);
            const allRows = json?.data;
            if (Array.isArray(allRows)) {
              const target = allRows.find((r: PermissionItem) => r.ticket_number === ticketParam);
              if (target) setDeepTicket(target);
            }
          } catch {
            // Leave the register empty — the deep link just does not resolve.
          }
        })();
      }
    }
  };

  const base =
    status === "OVERDUE"
      ? "/api/permissions?stage=principal&overdue=true"
      : status === "DELEGATED"
      ? "/api/permissions?stage=principal&delegated_to=me"
      : `/api/permissions?stage=principal&status=${status}`;
  const url = workflowType
    ? `${base}&workflow_type=${encodeURIComponent(workflowType)}`
    : base;

  const { data, loading, refresh } = useApiResource<PermissionsResponse>(url, {
    ttlMs: 15_000,
  });
  usePolling(refresh, { intervalMs: 15_000 });
  const addToast = useUIStore((s) => s.addToast);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const runPrincipalAction = async (
    ticketNumber: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    reason?: string,
  ) => {
    setActionBusy(action);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action, ...(reason ? { reason, comment: reason } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        addToast({
          message: `${action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Escalated"} ${ticketNumber}`,
          variant: "success",
        });
        setSelected(null);
        setDeepTicket(null);
        setRejectNote("");
        setShowRejectInput(false);
        invalidateApiCache(["/api/permissions", "/api/principal/dashboard", "/api/admin/overview"]);
        await refresh();
      } else {
        addToast({
          message: json?.error?.message ?? `Failed to ${action.toLowerCase()} ${ticketNumber}`,
          variant: "error",
        });
      }
    } catch {
      addToast({ message: "Network error processing approval action", variant: "error" });
    } finally {
      setActionBusy(null);
    }
  };
  const { data: dashData } = useApiResource<{
    data?: {
      counts?: { pending?: number; escalated?: number; overdue?: number; delegated?: number };
    };
  }>("/api/principal/dashboard", { ttlMs: 30_000 });
  const dashCounts = dashData?.data?.counts;

  const rows = data?.data ?? [];

  useEffect(() => { openTicket(rows); }, [data]); // eslint-disable-line

  // Role-appropriate depth: the Actions section of the shared model is built
  // for the current viewer (the /principal/cases pattern).
  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };

  const toApprovalRecord = (item: PermissionItem): ApprovalRecord => ({
    ticket_number: item.ticket_number,
    workflow_type: item.workflow_type,
    status: item.status,
    current_stage: item.current_stage,
    reason: item.reason ?? null,
    student_name: item.student?.name,
    roll: item.student?.student_details?.roll,
    hostel_block: item.student?.student_details?.hostel_block,
    room_number: item.student?.student_details?.room_number,
    sla_deadline: item.sla_deadline ?? null,
    created_at: item.created_at,
  });

  const activeEntity = selected ?? deepTicket;
  const inspectionBase = activeEntity ? buildApprovalInspection(toApprovalRecord(activeEntity), gate) : null;
  const inspection = inspectionBase && activeEntity
    ? {
        ...inspectionBase,
        sections: [
          ...inspectionBase.sections,
          {
            title: "Workflow",
            collapsible: true,
            content: (
              <KVPairs
                items={[
                  {
                    label: "Stage",
                    value: <span className="font-mono">{activeEntity.current_stage}</span>,
                  },
                  {
                    label: "SLA deadline",
                    value: activeEntity.sla_deadline
                      ? new Date(activeEntity.sla_deadline).toLocaleString("en-IN")
                      : "—",
                  },
                  {
                    label: "Created",
                    value: new Date(activeEntity.created_at).toLocaleString("en-IN"),
                  },
                  ...(activeEntity.from_date || activeEntity.to_date
                    ? [
                        {
                          label: "Validity",
                          value: `${activeEntity.from_date ?? "—"} → ${activeEntity.to_date ?? "—"}`,
                        },
                      ]
                    : []),
                  {
                    label: "Document",
                    value: activeEntity.document_url ? (
                      <a
                        href={activeEntity.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-action-primary hover:underline"
                      >
                        View document
                      </a>
                    ) : activeEntity.document_required ? (
                      <span className="text-text-muted">Required — not provided</span>
                    ) : (
                      "Not required"
                    ),
                  },
                ]}
              />
            ),
          },
          {
            title: "Principal Decision",
            content: (
              <div className="space-y-2.5" data-testid="principal-inline-actions">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionBusy !== null}
                    onClick={() => runPrincipalAction(activeEntity.ticket_number, "APPROVE")}
                    data-testid="action-approve"
                    className="rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {actionBusy === "APPROVE" ? "Approving..." : "Approve & Confirm"}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy !== null}
                    onClick={() => {
                      if (!showRejectInput) {
                        setShowRejectInput(true);
                        return;
                      }
                      runPrincipalAction(activeEntity.ticket_number, "REJECT", rejectNote.trim() || "Rejected by Principal");
                    }}
                    data-testid="action-reject"
                    className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-action-danger hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    {actionBusy === "REJECT" ? "Rejecting..." : showRejectInput ? "Confirm Reject" : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy !== null}
                    onClick={() => runPrincipalAction(activeEntity.ticket_number, "ESCALATE")}
                    data-testid="action-escalate"
                    className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface disabled:opacity-50"
                  >
                    {actionBusy === "ESCALATE" ? "Escalating..." : "Escalate"}
                  </button>
                </div>
                {showRejectInput && (
                  <input
                    type="text"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full rounded-lg border border-border bg-bg-base px-3 py-1.5 text-xs text-text-primary"
                  />
                )}
              </div>
            ),
          },
        ],
      }
    : null;

  return (
    <div className="space-y-4">
      <WeekBar />
      <section className="surface-card p-4 md:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
            <p className="text-xs text-text-muted">
              {rows.length} request{rows.length === 1 ? "" : "s"} · click any row to inspect &amp; decide
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Approval queue slices">
            {[
              { key: "PENDING", label: "Pending", count: dashCounts?.pending, href: "/principal/approvals/pending" },
              { key: "ESCALATED", label: "Escalated", count: dashCounts?.escalated, href: "/principal/approvals/escalated" },
              { key: "OVERDUE", label: "Overdue SLA", count: dashCounts?.overdue, href: "/principal/approvals/overdue" },
              { key: "DELEGATED", label: "Delegated", count: dashCounts?.delegated, href: "/principal/approvals/delegated" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  status === tab.key
                    ? "border-action-primary bg-action-primary/10 text-action-primary"
                    : "border-border bg-bg-surface text-text-secondary hover:bg-bg-elevated"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span className="font-mono text-[11px] opacity-80">{tab.count}</span>
                )}
              </Link>
            ))}
            <RoleExportButton
              resource="approvals-ledger"
              filenamePrefix={`principal-approvals-${status.toLowerCase()}`}
              rows={rows}
              columns={[
                { key: "ticket_number", header: "Ticket" },
                { key: "student", header: "Student", accessor: (r) => r.student?.name ?? "" },
                { key: "workflow_type", header: "Workflow" },
                { key: "current_stage", header: "Stage" },
                { key: "status", header: "Status" },
                { key: "sla_deadline", header: "SLA Deadline" },
              ]}
            />
          </nav>
        </header>

        <ActiveFilterBar
          chips={[
            {
              key: "status",
              label: "Slice",
              value: status,
              onRemove: () => router.push("/principal/approvals"),
            },
          ]}
          shownCount={rows.length}
          totalCount={data?.total ?? rows.length}
          noun="requests"
        />

        {loading && rows.length === 0 ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <PrincipalEmptyReconciler
            title={`0 ${status.toLowerCase()} requests at Principal stage`}
            headlineCount={
              (dashCounts?.pending ?? 0) +
              (dashCounts?.escalated ?? 0) +
              (dashCounts?.overdue ?? 0) +
              (dashCounts?.delegated ?? 0) ||
              data?.total
            }
            breakdown={[
              { label: "Pending", count: dashCounts?.pending ?? 0, href: "/principal/approvals/pending" },
              { label: "Escalated", count: dashCounts?.escalated ?? 0, href: "/principal/approvals/escalated" },
              { label: "Overdue SLA", count: dashCounts?.overdue ?? 0, href: "/principal/approvals/overdue" },
              { label: "Delegated", count: dashCounts?.delegated ?? 0, href: "/principal/approvals/delegated" },
            ]}
          />
        ) : (
          <ActionFirstApprovalsWorkspace
            items={rows}
            role="principal"
            currentPath="/principal/approvals"
            treatAllPendingAsActionable
            onInspect={(item) => setSelected(item)}
            onRefresh={refresh}
            focusHref="/principal/attention"
            ledgerColumns={[
              { header: "Ticket", accessor: (r) => r.ticket_number },
              { header: "Student", accessor: (r) => r.student?.name ?? "—" },
              { header: "Type", accessor: (r) => r.workflow_type },
              { header: "Stage", accessor: (r) => r.current_stage },
              {
                header: "SLA",
                accessor: (r) => (
                  <SlaBadge slaDeadline={r.sla_deadline ?? null} status={r.status} />
                ),
              },
            ]}
          />
        )}
      </section>

      <EntityInspector
        inspection={inspection}
        onClose={() => { setSelected(null); setDeepTicket(null); }}
      />

      {/* Decision history — monthly review of this approver's own decisions */}
      <Suspense fallback={null}>
        <DecisionHistoryPanel />
      </Suspense>
    </div>
  );
}
