"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Review institutional approval requests delegated to your desk from vice principals or wardens"
        contextLabel="Delegated Approvals"
        statusSummary="Monitor workflow requests delegated for executive review and determination."
        primaryAction={{ label: "Pending Approvals", href: "/principal/approvals" }}
        secondaryAction={{ label: "Decision Ledger", href: "/principal/decisions" }}
      />
      <ApprovalsView status="DELEGATED" title="Delegated to you" />
    </div>
  );
}
