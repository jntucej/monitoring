"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ReportsView } from "../_shared/ReportsView";

export default function ReportsPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Generate departmental analytics, academic metrics, and student performance summaries."
        contextLabel="Department Analytics"
        statusTone="info"
        statusSummary="Audit attendance rates, course evaluations, and departmental compliance reports."
        primaryAction={{ label: "Today Overview", href: "/hod/home" }}
        secondaryActions={[
          { label: "Approvals Queue", href: "/hod" },
          { label: "Faculty Directory", href: "/hod/faculty/directory" },
        ]}
      />
      <ReportsView />
    </div>
  );
}
