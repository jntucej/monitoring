"use client";
export const dynamic = "force-dynamic";

// src/app/(sysadmin)/sysadmin/hostel-tickets/page.tsx
// SCAFFOLD:TICKETS — cross-cutting Hostel ticket view.

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DataTable } from "@/components/ui/DataTable";
import { useDashboardData } from "@/hooks/useDashboardData";
import { ClipboardList } from "lucide-react";

interface Row {
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  student_user_id: string;
  requester_name: string;
  created_at: string;
}

export default function HostelTicketsAdminPage() {
  const { data, loading, error } = useDashboardData<{ success: boolean; data: Row[] }>(
    "/api/admin/hostel-tickets",
    { ttlMs: 10_000, pollMs: 60_000 },
  );

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin", "warden", "principal"] as never}>
      <div className="space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-fluid-lg font-semibold">
          <ClipboardList className="h-5 w-5" />
          Hostel Tickets
        </h1>
        <DataTable<Row>
          columns={[
            { header: "Ticket", accessor: (r) => <span className="font-mono text-xs">{r.ticket_number}</span> },
            { header: "Type", accessor: (r) => r.workflow_type },
            { header: "Requester", accessor: (r) => r.requester_name },
            { header: "Stage", accessor: (r) => r.current_stage },
            { header: "Status", accessor: (r) => r.status },
            { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleString() },
          ]}
          data={data?.data ?? []}
          loading={loading}
          error={error}
          keyExtractor={(r) => r.ticket_number}
          emptyMessage="No tickets."
        />
      </div>
    </AuthGuard>
  );
}
