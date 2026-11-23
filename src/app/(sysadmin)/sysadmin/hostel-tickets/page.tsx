"use client";

// src/app/(sysadmin)/sysadmin/hostel-tickets/page.tsx
// SCAFFOLD:TICKETS — cross-cutting Hostel ticket view.

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector, KVPairs, ActionRow, InspectorButton } from "@/components/shared/EntityInspector";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useState } from "react";
import { ClipboardList } from "lucide-react";

interface Row {
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  student_user_id: string;
  requester_name: string | null;
  created_at: string;
}

export default function HostelTicketsAdminPage() {
  const { data, loading, error } = useDashboardData<Row[]>(
    "/api/admin/hostel-tickets",
    { ttlMs: 10_000, pollMs: 60_000 },
  );
  const [active, setActive] = useState<Row | null>(null);

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin", "principal"] as never}>
      <div className="space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-fluid-lg font-semibold">
          <ClipboardList className="h-5 w-5" />
          Hostel Tickets
        </h1>
        <DataTable<Row>
          onRowClick={(r) => setActive(r)}
          columns={[
            { header: "Ticket", accessor: (r) => <span className="font-mono text-xs">{r.ticket_number}</span> },
            { header: "Type", accessor: (r) => r.workflow_type },
            { header: "Requester", accessor: (r) => r.requester_name ?? "Unknown" },
            { header: "Stage", accessor: (r) => r.current_stage },
            { header: "Status", accessor: (r) => r.status },
            { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleString() },
          ]}
          data={data ?? []}
          loading={loading}
          error={error}
          keyExtractor={(r) => r.ticket_number}
          emptyMessage="No tickets."
        />

        <EntityInspector
          inspection={active ? {
            kind: "ticket",
            title: active.ticket_number,
            subtitle: active.workflow_type,
            status: (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
                {active.status}
              </span>
            ),
            sections: [
              {
                title: "Overview",
                content: (
                  <KVPairs
                    items={[
                      { label: "Workflow", value: active.workflow_type },
                      { label: "Requester", value: active.requester_name ?? "Unknown" },
                      { label: "Stage", value: <span className="font-mono text-xs">{active.current_stage}</span> },
                      { label: "Status", value: active.status },
                      { label: "Created", value: new Date(active.created_at).toLocaleString("en-IN") },
                    ]}
                  />
                ),
              },
              {
                title: "Actions",
                content: (
                  <ActionRow>
                    <InspectorButton
                      variant="primary"
                      href="/sysadmin/hostel-tickets"
                    >
                      Open ticket register
                    </InspectorButton>
                  </ActionRow>
                ),
              },
            ],
          } : null}
          onClose={() => setActive(null)}
        />
      </div>
    </AuthGuard>
  );
}
