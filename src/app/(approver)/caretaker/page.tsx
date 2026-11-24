"use client";
// src/app/(approver)/caretaker/page.tsx — caretaker queue (complaints)
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Caretaker"
        purpose="Review and manage hostel complaint queues, triage student facility issues, and track resolutions"
        contextLabel="Caretaker Complaint Queue"
        statusSummary="Triage student facility complaints, assign maintenance personnel, and close resolved issues."
        severity="info"
        primaryAction={{ label: "Maintenance Tasks", href: "/caretaker/maintenance" }}
        secondaryActions={[
          { label: "Facilities Overview", href: "/caretaker/home" },
          { label: "Workers Status", href: "/caretaker/workers" },
        ]}
      />
      <ComplaintConsole role="caretaker" basePath="/caretaker/complaints" title="Caretaker Complaint Queue" />
    </div>
  );
}
