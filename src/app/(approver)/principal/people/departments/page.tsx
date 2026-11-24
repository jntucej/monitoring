"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { DepartmentsView } from "../../_shared/DepartmentsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Institutional oversight of academic and administrative departments, HOD leadership, and staff strength"
        contextLabel="Departmental Organization"
        statusSummary="Examine department profiles, faculty counts, student enrollments, and academic performance."
        primaryAction={{ label: "Assignment Tree", href: "/principal/people/assignment-tree" }}
        secondaryAction={{ label: "Attendance Exceptions", href: "/principal/people/attendance" }}
      />
      <DepartmentsView />
    </div>
  );
}
