"use client";
// src/app/(student)/student/complaints/new/page.tsx
import { ComplaintForm } from "@/components/complaints/ComplaintForm";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { RoleStarterGuide } from "@/components/shared/RoleStarterGuide";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">New Complaint</h1>
      <ContextSituationBar
        roleLabel="Student"
        purpose="Lodge hostel, campus facility, mess, or general student grievances for administrative resolution"
        contextLabel="Grievance Submission"
        statusSummary="Describe your campus or hostel issue. Tickets are dispatched to the warden or maintenance team."
        why="Selecting the right category routes your ticket to the responsible team and starts its resolution SLA timer."
        primaryAction={{ label: "View Complaints", href: "/student/complaints" }}
        secondaryAction={{ label: "Anti-Ragging Report", href: "/student/anti-ragging" }}
      />
      <RoleStarterGuide
        guideId="student-new-complaint"
        title="How Complaint Routing Works"
        summary="Pick a category, describe the issue clearly, and optionally target a specific role or person."
        steps={[
          "Choose category & describe issue",
          "Select target role (or leave default)",
          "Track resolution in My Complaints",
        ]}
      />
      <ComplaintForm />
      <p className="text-[11px] text-text-muted">
        After submitting, your complaint receives a ticket ID and appears in{" "}
        <span className="font-medium text-text-secondary">View Complaints</span>, where you can track status updates or escalate if overdue.
      </p>
    </div>
  );
}
