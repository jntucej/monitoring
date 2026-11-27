"use client";

import { FeatureContextPage } from "@/components/dashboard/FeatureContextPage";
import { ReportsView } from "../_shared/ReportsView";

export default function ReportsPage() {
  return (
    <FeatureContextPage
      roleLabel="Gate Supervisor"
      purpose="Generate and analyze security reports, transit volumes, and curfew compliance metrics"
      contextLabel="Security & Transit Reports"
      statusSummary="Compile operational incident logs, guard shift audits, and institutional gate transit summaries."
      why="Audited reports help security leadership spot persistent perimeter breaches, late return clusters, and peak traffic hours."
      area="security"
      hierarchyHref="/supervisor/hierarchy"
      primaryAction={{ label: "Curfew Compliance", href: "/supervisor/team/curfew" }}
      secondaryActions={[
        { label: "Shift History", href: "/supervisor/shift/history" },
      ]}
      breakdownTitle="Security Post Distribution"
    >
      <ReportsView />
    </FeatureContextPage>
  );
}
