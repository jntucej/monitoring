"use client";
// src/app/(student)/student/complaints/page.tsx
import { ComplaintConsole } from "@/components/complaints/ComplaintConsole";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Student"
        purpose="Review submitted grievances, track resolution progress, and respond to staff inquiries"
        contextLabel="Grievance Central"
        statusSummary="Monitor the live lifecycle of your campus maintenance, hostel, and academic complaints."
        why="Click any complaint below to view its timeline, reply to staff, or escalate if the SLA deadline is breached."
        primaryAction={{ label: "New Complaint", href: "/student/complaints/new" }}
        secondaryAction={{ label: "Anti-Ragging Report", href: "/student/anti-ragging" }}
      />
      <p className="text-[11px] text-text-muted">
        Lifecycle: <span className="font-medium text-text-secondary">Submitted → Acknowledged → In Progress → Resolved → Closed</span>.{" "}
        <span className="font-medium text-text-secondary">SLA</span> is the target resolution deadline; overdue tickets can be escalated inside the ticket view.
      </p>
      <ComplaintConsole role="student" basePath="/student/complaints" title="My Complaints" />
    </div>
  );
}
