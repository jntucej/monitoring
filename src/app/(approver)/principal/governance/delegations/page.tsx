"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { DelegationsView } from "../../_shared/DelegationsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Executive power delegation management, proxy approval authorization, and delegation lifecycle audit"
        why="Delegating approval authority prevents administrative gridlock during executive travel while maintaining strict role boundaries."
        contextLabel="Statutory Delegations Desk"
        statusSummary="Authorize and manage delegation of executive signing and approval powers to Vice Principals and HODs."
        primaryAction={{ label: "Audit Ledger", href: "/principal/governance/audit" }}
        secondaryAction={{ label: "Governance Reports", href: "/principal/governance/reports" }}
      />
      <DelegationsView />
    </div>
  );
}
