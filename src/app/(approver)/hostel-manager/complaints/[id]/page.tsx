"use client";
// src/app/(approver)/hostel-manager/complaints/[id]/page.tsx
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintDetail } from "@/components/complaints/ComplaintDetail";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Review block-level student complaints, coordinate facilities fixes, and monitor resolution progress"
        contextLabel="Hostel Grievance Detail"
        statusSummary="Inspect resident complaints in your block, review staff activity notes, and ensure operational resolution."
        severity="info"
        primaryAction={{ label: "Complaint Queue", href: "/hostel-manager/complaints" }}
        secondaryActions={[
          { label: "Maintenance Tasks", href: "/hostel-manager/maintenance" },
          { label: "Housekeeping", href: "/hostel-manager/housekeeping-tasks" },
        ]}
      />
      <ComplaintDetail role="hostel_manager" />
    </div>
  );
}
