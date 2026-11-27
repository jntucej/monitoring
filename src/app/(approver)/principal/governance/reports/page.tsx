"use client";

import { FeatureContextPage } from "@/components/dashboard/FeatureContextPage";
import { ReportsView } from "../../_shared/ReportsView";

export default function Page() {
  return (
    <FeatureContextPage
      roleLabel="Principal"
      purpose="Generate institutional compliance reports, board audit packs, and accreditation summaries"
      why="Authoritative governance reports support board reviews, statutory accreditation audits, and campus safety assessments."
      contextLabel="Institutional Governance Reports"
      statusSummary="Produce authoritative institutional compliance digests, gate safety reports, and academic reviews."
      area="institutional"
      hierarchyHref="/principal/hierarchy"
      primaryAction={{ label: "Governance Analytics", href: "/principal/governance/analytics" }}
      secondaryActions={[
        { label: "Delegations Desk", href: "/principal/governance/delegations" },
      ]}
      breakdownTitle="Institutional Unit Readiness"
    >
      <ReportsView />
    </FeatureContextPage>
  );
}
