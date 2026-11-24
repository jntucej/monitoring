"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Final executive review for high-risk exceptions, emergency passes, and policy escalations"
        contextLabel="Escalated Approvals Queue"
        statusSummary="Executive adjudication queue for tickets escalated past standard departmental thresholds."
        severity="warn"
        primaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        secondaryAction={{ label: "Overdue Approvals", href: "/principal/approvals/overdue" }}
      />
      <ApprovalsView status="ESCALATED" title="Escalated to you" />
    </div>
  );
}
