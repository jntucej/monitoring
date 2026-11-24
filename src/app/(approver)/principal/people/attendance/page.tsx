"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ExceptionsView } from "../../_shared/ExceptionsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Institutional attendance compliance monitoring, chronic absenteeism review, and debarment oversight"
        contextLabel="Attendance Exceptions Register"
        statusSummary="Review institutional attendance thresholds, student shortage warnings, and condonation appeals."
        severity="warn"
        primaryAction={{ label: "People Directory", href: "/principal/people" }}
        secondaryAction={{ label: "Departments", href: "/principal/people/departments" }}
      />
      <ExceptionsView />
    </div>
  );
}
