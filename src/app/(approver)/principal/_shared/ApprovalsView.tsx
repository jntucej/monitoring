"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector, KVPairs } from "@/components/shared/EntityInspector";
import { HoverPreview } from "@/components/shared/HoverPreview";
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
  const [ticketParam] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ticket")
      : null
  );
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
        ],
      }
    : null;

  return (
    <div className="space-y-4">
      <WeekBar />
      <section className="surface-card p-4 md:p-5">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          <p className="text-xs text-text-muted">
            {rows.length} request{rows.length === 1 ? "" : "s"}
          </p>
        </header>

        {loading && rows.length === 0 ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing here" description="No requests in this view." />
        ) : (
          <>
          <ul className="space-y-2 md:hidden">
            {rows.map((item) => (
              <li key={item.id}>
                <HoverPreview
                  preview={
                    <div className="space-y-1">
                      <p className="font-semibold text-xs">{item.student?.name ?? "Unknown"}</p>
                      <p className="text-[10px] text-text-muted">{item.ticket_number} · {item.workflow_type}</p>
                      <p className="text-[10px] text-text-secondary">{item.reason ?? item.workflow_type}</p>
                    </div>
                  }
                  position="right"
                >
                  <button
                    onClick={() => setSelected(item)}
                    className="surface-card w-full min-h11 bg-bg-surface p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.student?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.ticket_number} · {item.workflow_type}
                        </p>
                      </div>
                      <SlaBadge slaDeadline={item.sla_deadline ?? null} status={item.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                      {item.reason ?? item.workflow_type}
                    </p>
                  </button>
                </HoverPreview>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<PermissionItem>
              onRowClick={(item) => setSelected(item)}
              columns={[
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
              data={rows}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
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
