"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ExceptionsView } from "../../_shared/ExceptionsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Institutional academic exception audit, curriculum deviation tracking, and attendance shortfalls"
        why="Tracking academic exceptions identifies students needing curriculum remediation, course waivers, or attendance intervention."
        contextLabel="Academic Exceptions Queue"
        statusSummary="Investigate course prerequisite waivers, timetable conflicts, and academic standing exceptions."
        severity="warn"
        primaryAction={{ label: "Attendance Exceptions", href: "/vice-principal/attendance-exceptions" }}
        secondaryAction={{ label: "Department Performance", href: "/vice-principal/department-performance" }}
      />
      <ExceptionsView />
    </div>
  );
}
