"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { ListSkeleton } from "./ListSkeleton";
import { DetailSheet } from "./DetailSheet";
import { WeekBar } from "./WeekBar";
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
  status: "PENDING" | "ESCALATED";
  title: string;
}) {
  const [selected, setSelected] = useState<PermissionItem | null>(null);

  const openStageDrawer = (item: PermissionItem) => {
    setSelected(item);
  };

  const url = `/api/permissions?stage=hod&status=${status}`;

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
            role="hod"
            currentPath="/hod/approvals"
            treatAllPendingAsActionable
            onInspect={(item) => openStageDrawer(item)}
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

      <DetailSheet
        item={selected}
        onClose={() => setSelected(null)}
        onActionComplete={() => {
          setSelected(null);
          refresh();
        }}
      />
    </div>
  );
}
