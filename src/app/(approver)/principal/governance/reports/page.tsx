"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ReportsView } from "../../_shared/ReportsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Generate institutional compliance reports, board audit packs, and accreditation summaries"
        why="Authoritative governance reports support board reviews, statutory accreditation audits, and campus safety assessments."
        contextLabel="Institutional Governance Reports"
        statusSummary="Produce authoritative institutional compliance digests, gate safety reports, and academic reviews."
        primaryAction={{ label: "Governance Analytics", href: "/principal/governance/analytics" }}
        secondaryAction={{ label: "Delegations Desk", href: "/principal/governance/delegations" }}
      />
      <ReportsView />
    </div>
  );
}
