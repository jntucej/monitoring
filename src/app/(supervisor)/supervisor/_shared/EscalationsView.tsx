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

interface EscalationsResponse {
  success: boolean;
  data: {
    escalatedPermissions: PermissionItem[];
    activeAlerts: unknown[];
    recentDecisions: unknown[];
    scope: string;
    counts: { escalated: number; alerts: number; decisions: number };
  };
}

export function EscalationsView() {
  const [selected, setSelected] = useState<PermissionItem | null>(null);

  const { data, loading, refresh } = useApiResource<EscalationsResponse>(
    "/api/supervisor/escalations",
    { ttlMs: 15_000 }
  );

  // The API returns data as an object (not a bare array): {
  //   escalatedPermissions: PermissionItem[], activeAlerts, recentDecisions,
  //   scope, counts }. Guard with Array.isArray so a null/object never
  //   crashes the .map below (the "$h.map is not a function" crash).
  // The API's escalatedPermissions rows carry a flat `student_name` (not the
  // nested `student` object PermissionItem expects) — normalize it so the
  // name column renders instead of "Unknown".
  const rows: PermissionItem[] = (
    Array.isArray(data?.data?.escalatedPermissions)
      ? data.data.escalatedPermissions
      : []
  ).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    const name = row.student_name ?? (row.student as { name?: string } | null)?.name ?? null;
    if (!name) return r;
    return { ...r, student: { name: String(name), ...(r.student ?? {}) } } as PermissionItem;
  });

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Escalations</h1>
        <p className="text-xs text-text-muted">
          {rows.length} open escalation{rows.length === 1 ? "" : "s"} needing supervisor action
        </p>
      </header>

      {loading && rows.length === 0 ? (
        <ListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No escalations in this view." />
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
                { header: "Requester", accessor: (r) => r.student?.name ?? "—" },
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
