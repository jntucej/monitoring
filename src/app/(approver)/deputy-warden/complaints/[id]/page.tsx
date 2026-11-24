"use client";
// src/app/(approver)/deputy-warden/complaints/[id]/page.tsx
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintDetail } from "@/components/complaints/ComplaintDetail";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Deputy Warden"
        purpose="Review escalation timeline, assess hostel disciplinary or safety complaints, and take corrective action"
        contextLabel="Complaint Detail & Escalation"
        statusSummary="Inspect incident chronology, record warden notes, and advance disciplinary or safety complaint resolutions."
        severity="info"
        primaryAction={{ label: "Complaint Queue", href: "/deputy-warden/complaints" }}
        secondaryActions={[
          { label: "Daily Overview", href: "/deputy-warden/daily-overview" },
          { label: "Incident Reporting", href: "/deputy-warden/incident-reporting" },
        ]}
      />
      <ComplaintDetail role="deputy_warden" />
    </div>
  );
}
