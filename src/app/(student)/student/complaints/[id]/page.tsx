"use client";
// src/app/(student)/student/complaints/[id]/page.tsx
import { ComplaintDetail } from "@/components/complaints/ComplaintDetail";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Student"
        purpose="Track the investigation, assignment, and resolution timeline of your grievance ticket"
        contextLabel="Grievance Detail & Resolution"
        statusSummary="View incident notes, investigator actions, and resolution steps for this complaint."
        why="Follow step-by-step progress as campus staff investigate, communicate updates, and close the issue within stated SLA targets."
        primaryAction={{ label: "All Complaints", href: "/student/complaints" }}
        secondaryAction={{ label: "New Complaint", href: "/student/complaints/new" }}
      />
      <ComplaintDetail role="student" />
    </div>
  );
}
