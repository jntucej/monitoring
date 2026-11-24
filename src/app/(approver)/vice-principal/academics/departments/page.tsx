"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { DepartmentsView } from "../../_shared/DepartmentsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Monitor academic departments, faculty allocations, and instructional metrics"
        contextLabel="Academic Departments Register"
        statusSummary="Review department performance indicators, HOD staffing status, and student rosters."
        primaryAction={{ label: "Academic Exceptions", href: "/vice-principal/academics/exceptions" }}
        secondaryAction={{ label: "Performance Overview", href: "/vice-principal/department-performance" }}
      />
      <DepartmentsView />
    </div>
  );
}
