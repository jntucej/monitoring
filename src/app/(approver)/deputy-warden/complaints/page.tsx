"use client";
// src/app/(approver)/deputy-warden/complaints/page.tsx
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Deputy Warden"
        purpose="Review and manage hostel complaint queues, address safety and living conditions, and escalate when necessary"
        contextLabel="Hostel Complaints Queue"
        statusSummary="Monitor escalated grievances, assign hostel caretaker actions, and resolve resident complaints."
        severity="info"
        primaryAction={{ label: "Daily Overview", href: "/deputy-warden/daily-overview" }}
        secondaryActions={[
          { label: "Outpass Queue", href: "/deputy-warden" },
          { label: "Incident Reporting", href: "/deputy-warden/incident-reporting" },
        ]}
      />
      <ComplaintConsole role="deputy_warden" basePath="/deputy-warden/complaints" title="Deputy Warden Complaint Queue" />
    </div>
  );
}
