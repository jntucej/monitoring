"use client";

import { FeatureContextPage } from "@/components/dashboard/FeatureContextPage";
import { ReportsView } from "../_shared/ReportsView";

export default function ReportsPage() {
  return (
    <FeatureContextPage
      roleLabel="Head of Department"
      purpose="Generate departmental analytics, academic metrics, and student performance summaries."
      why="Analyzing attendance trends and pass metrics highlights systemic learning gaps and departmental accreditation indicators."
      contextLabel="Department Analytics"
      statusTone="info"
      statusSummary="Audit attendance rates, course evaluations, and departmental compliance reports."
      area="department"
      hierarchyHref="/hod/hierarchy"
      primaryAction={{ label: "Today Overview", href: "/hod/home" }}
      secondaryActions={[
        { label: "Approvals Queue", href: "/hod" },
        { label: "Faculty Directory", href: "/hod/faculty/directory" },
      ]}
      breakdownTitle="Department Unit Distribution"
    >
      <ReportsView />
    </FeatureContextPage>
  );
}
