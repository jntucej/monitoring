"use client";
// src/app/(approver)/hostel-manager/complaints/page.tsx
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Manage hostel block complaints, assign housekeeping and maintenance repairs, and track resolution metrics"
        contextLabel="Hostel Complaints Console"
        statusSummary="Monitor and prioritize complaints submitted by residents in your assigned hostel blocks."
        severity="info"
        primaryAction={{ label: "Maintenance", href: "/hostel-manager/maintenance" }}
        secondaryActions={[
          { label: "Housekeeping Tasks", href: "/hostel-manager/housekeeping-tasks" },
          { label: "Resident Tickets", href: "/hostel-manager" },
        ]}
      />
      <ComplaintConsole role="hostel_manager" basePath="/hostel-manager/complaints" title="Hostel Manager Complaint Queue" />
    </div>
  );
}
