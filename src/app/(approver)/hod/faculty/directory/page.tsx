"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { FacultyDirectoryView } from "../../_shared/FacultyDirectoryView";

export default function FacultyDirectoryPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Maintain teaching staff profiles, subject allocations, and departmental roles."
        why="Checking faculty directories ensures correct subject mapping and points of contact for students."
        contextLabel="Faculty Directory"
        statusTone="info"
        statusSummary="View department faculty profiles, workload distributions, and contact information."
        primaryAction={{ label: "Faculty Attendance", href: "/hod/faculty/attendance" }}
        secondaryActions={[
          { label: "Today Overview", href: "/hod/home" },
          { label: "Approvals Queue", href: "/hod" },
        ]}
      />
      <FacultyDirectoryView />
    </div>
  );
}
