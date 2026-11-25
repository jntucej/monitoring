"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="High-priority review for requests escalated by HODs, wardens, or SLA timeouts"
        why="Intervening on escalated items resolves departmental deadlocks and upholds consistent institutional standards."
        contextLabel="Escalated Approvals Ledger"
        statusSummary="Review urgent approval escalations requiring Vice Principal executive intervention."
        severity="warn"
        primaryAction={{ label: "Pending Queue", href: "/vice-principal/pending-approvals" }}
        secondaryAction={{ label: "Decision History", href: "/vice-principal/decision-history" }}
      />
      <ApprovalsView status="ESCALATED" title="Escalated approvals" />
    </div>
  );
}
