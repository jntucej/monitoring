"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

export default function HostelManagerMaintenancePage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Maintenance"
        subtitle="Hostel repair requests routed to your block."
      />
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Oversee block maintenance workflows, coordinate technician work orders, and verify repair completion"
        why="Monitoring active repair orders ensures electrical, civil, and plumbing issues are resolved within SLA standards."
        contextLabel="Hostel Maintenance Console"
        statusSummary="Track and prioritize electrical, civil, and plumbing repair work orders across your hostel blocks."
        severity="info"
        primaryAction={{ label: "Housekeeping", href: "/hostel-manager/housekeeping-tasks" }}
        secondaryActions={[
          { label: "Resource Management", href: "/hostel-manager/resource-management" },
          { label: "Resident Tickets", href: "/hostel-manager" },
        ]}
      />
      <ComplaintConsole role="hostel_manager" basePath="/api/complaints" title="Hostel Maintenance" />
    </div>
  );
}
