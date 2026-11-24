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
        primaryAction={{ label: "New Complaint", href: "/student/complaints/new" }}
        secondaryAction={{ label: "Anti-Ragging Report", href: "/student/anti-ragging" }}
      />
      <ComplaintConsole role="student" basePath="/student/complaints" title="My Complaints" />
    </div>
  );
}
