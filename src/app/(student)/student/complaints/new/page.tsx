"use client";
// src/app/(student)/student/complaints/new/page.tsx
import { ComplaintForm } from "@/components/complaints/ComplaintForm";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">New Complaint</h1>
      <ContextSituationBar
        roleLabel="Student"
        purpose="Lodge hostel, campus facility, mess, or general student grievances for administrative resolution"
        contextLabel="Grievance Submission"
        statusSummary="Describe your campus or hostel issue. Tickets are dispatched to the warden or maintenance team."
        primaryAction={{ label: "View Complaints", href: "/student/complaints" }}
        secondaryAction={{ label: "Anti-Ragging Report", href: "/student/anti-ragging" }}
      />
      <ComplaintForm />
    </div>
  );
}
