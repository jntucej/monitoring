"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { ListSkeleton } from "./ListSkeleton";
import { DetailSheet } from "./DetailSheet";
import { WeekBar } from "./WeekBar";
import {
  ApproverStageDrawer,
  type StagePivotItem,
} from "@/components/nav/level2/ApproverStageDrawer";

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
  const [stageItem, setStageItem] = useState<StagePivotItem | null>(null);

  const openStageDrawer = (item: PermissionItem) => {
    setSelected(item);
    setStageItem({
      ticketId: item.id,
      ticketNumber: item.ticket_number,
      workflowType: item.workflow_type,
      currentStage: item.current_stage,
      status: item.status,
      studentId: item.student?.id,
      studentName: item.student?.name,
      studentRoll: item.student?.student_details?.roll,
      stages: [
        "student",
        "faculty",
        "hod",
        "deputy_warden",
        "hostel_manager",
        "warden",
        "principal",
      ],
    });
  };

  const url = `/api/permissions?stage=hod&status=${status}`;

  const { data, loading, refresh } = useApiResource<PermissionsResponse>(url, {
    ttlMs: 15_000,
  });

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
          <>
          <ul className="space-y-2 md:hidden">
            {rows.map((item) => (
              <li key={item.id}>
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
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<PermissionItem>
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
              onRowClick={(r) => openStageDrawer(r)}
            />
          </div>
        </>
        )}
      </section>

      <DetailSheet
        item={selected}
        onClose={() => {
          setSelected(null);
          setStageItem(null);
        }}
        onActionComplete={() => {
          setSelected(null);
          setStageItem(null);
          refresh();
        }}
      />

      <ApproverStageDrawer
        item={stageItem}
        onClose={() => setStageItem(null)}
      />
    </div>
  );
}
