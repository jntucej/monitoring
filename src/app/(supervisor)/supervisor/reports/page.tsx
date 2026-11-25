"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ReportsView } from "../_shared/ReportsView";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Generate and analyze security reports, transit volumes, and curfew compliance metrics"
        contextLabel="Security & Transit Reports"
        statusSummary="Compile operational incident logs, guard shift audits, and institutional gate transit summaries."
        why="Audited reports help security leadership spot persistent perimeter breaches, late return clusters, and peak traffic hours."
        primaryAction={{ label: "Curfew Compliance", href: "/supervisor/team/curfew" }}
        secondaryAction={{ label: "Shift History", href: "/supervisor/shift/history" }}
      />
      <ReportsView />
    </div>
  );
}
