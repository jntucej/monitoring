"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { passTicketInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { ListSkeleton } from "./ListSkeleton";
import { DetailSheet } from "./DetailSheet";
import { WeekBar } from "./WeekBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { CommandPivotDrawer, type CommandPivotTarget } from "@/components/nav/level3/CommandPivotDrawer";

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
  const [pivot, setPivot] = useState<CommandPivotTarget | null>(null);
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();

  const { data, loading, refresh } = useApiResource<EscalationsResponse>(
    "/api/supervisor/escalations",
    { ttlMs: 15_000 }
  );

  /** Quick-inspect: overview + SLA + a single CTA that opens the deepest
   *  layer (the local DecisionSheet with the full approve/reject workflow).
   *  The decision itself only ships through the real route
   *  PATCH /api/permissions/[ticket]; the inspector never invents one. */
  const quickInspect = (item: PermissionItem) => {
    inspect(
      passTicketInspection(
        {
          id: item.id,
          ticket_number: item.ticket_number,
          workflow_type: item.workflow_type,
          status: item.status,
          current_stage: item.current_stage,
          sla_deadline: item.sla_deadline ?? null,
          reason: item.reason,
          student: item.student
            ? {
                name: item.student.name,
                student_details: item.student.student_details ?? undefined,
              }
            : null,
        },
        {
          role,
          onVerify: () => {
            closeInspection();
            setSelected(item);
          },
        },
      ),
    );
    setPivot({
      kind: "ticket",
      id: item.ticket_number,
      title: item.student?.name ?? item.ticket_number,
      subtitle: `${item.workflow_type} · ${item.current_stage} · ${item.status}`,
      fullRoute: `/permissions/${encodeURIComponent(item.ticket_number)}`,
      relatedLinks: [
        { label: "Escalations", href: "/supervisor/response/escalations" },
        { label: "Incidents", href: "/supervisor/response/incidents" },
        { label: "Gates", href: "/supervisor/gates" },
        { label: "Team", href: "/supervisor/team" },
        { label: "Shifts", href: "/supervisor/shift" },
        { label: "Reports", href: "/supervisor/reports" },
      ],
    });
  };
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

      <ApproverDecisionQueue
        roleLabel="Supervisor"
        forwardLabel="Escalate to VP"
        relatedHref="/supervisor/gates/live"
        relatedLabel="Live Gates"
      />

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
                  className="surface-card w-full min-h-11 bg-bg-surface p-3 text-left"
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
              onRowClick={(r) => quickInspect(r)}
            />
          </div>
        </>
      )}

      <EntityInspector inspection={inspection} onClose={() => { closeInspection(); setPivot(null); }} />
      <CommandPivotDrawer target={pivot} onClose={() => setPivot(null)} />

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
