"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { StudentDirectoryView } from "../_shared/StudentDirectoryView";

export default function StudentDirectoryPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Search and inspect department student rosters, enrollments, and academic standing."
        contextLabel="Department Students"
        statusTone="info"
        statusSummary="Browse student records, registration statuses, and year-wise distributions."
        primaryAction={{ label: "Today Overview", href: "/hod/home" }}
        secondaryActions={[
          { label: "Approvals Queue", href: "/hod" },
          { label: "Department Classes", href: "/hod/classes" },
        ]}
      />
      <StudentDirectoryView />
    </div>
  );
}
