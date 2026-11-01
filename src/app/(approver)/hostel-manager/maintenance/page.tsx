"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

export default function HostelManagerMaintenancePage() {
  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Maintenance"
        subtitle="Hostel repair requests routed to your block."
      />
      <ComplaintConsole role="hostel_manager" basePath="/api/complaints" title="Hostel Maintenance" />
    </div>
  );
}
