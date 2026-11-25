"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ExamsView } from "../_shared/ExamsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Institutional examination oversight, exam access exceptions, and hall ticket eligibility governance"
        why="Institutional examination oversight ensures fair condonation reviews, hall ticket clearances, and integrity enforcement."
        contextLabel="Examination Access Register"
        statusSummary="Review student exam access exceptions, hall clearances, and attendance prerequisite condonations."
        primaryAction={{ label: "Governance Audit", href: "/principal/governance/audit" }}
        secondaryAction={{ label: "Case Register", href: "/principal/cases" }}
      />
      <ExamsView />
    </div>
  );
}
