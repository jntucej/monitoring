"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { ticketRowInspection } from "@/components/approver/wardenConsoleModels";
import { ActionFirstApprovalsWorkspace } from "@/components/nav/ActionFirstApprovalsWorkspace";

interface PermissionsResponse {
  success: boolean;
  data: PermissionItem[];
  total?: number;
}

export function ApprovalsView({
  status,
  title,
}: {
  status: "PENDING" | "ESCALATED" | "ALL";
  title: string;
}) {
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const inspectRow = (item: PermissionItem) => {
    inspect(
      ticketRowInspection(
        {
          ticket_number: item.ticket_number,
          workflow_type: item.workflow_type,
          status: item.status,
          current_stage: item.current_stage,
          reason: item.reason ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          sla_deadline: item.sla_deadline ?? null,
          stage_history: item.stage_history ?? [],
          student: item.student ?? null,
        },
        { detailHref: "/vice-principal/pending-approvals", detailLabel: "Pending approvals" },
      ),
    );
  };

  const url =
    status === "ALL"
      ? "/api/permissions?stage=vice_principal&status=PENDING,ESCALATED"
      : `/api/permissions?stage=vice_principal&status=${status}`;

  const { data, loading, refresh } = useApiResource<PermissionsResponse>(url, {
    ttlMs: 15_000,
  });
  usePolling(refresh, { intervalMs: 15_000 });

  const rows = data?.data ?? [];

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
          <ActionFirstApprovalsWorkspace
            items={rows}
            role="vice_principal"
            currentPath="/vice-principal/pending-approvals"
            treatAllPendingAsActionable
            onInspect={(item) => inspectRow(item)}
            onRefresh={refresh}
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

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
