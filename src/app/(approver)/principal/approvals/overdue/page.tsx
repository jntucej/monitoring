"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Intervene on institutional requests that have breached service level agreement response deadlines"
        why="Resolving overdue requests ensures campus SLA compliance and prevents student academic or residential gridlock."
        contextLabel="SLA Breached Approvals"
        statusSummary="Time-critical requests that exceeded departmental SLA windows requiring immediate clearance."
        severity="critical"
        primaryAction={{ label: "Escalated Approvals", href: "/principal/approvals/escalated" }}
        secondaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
      />
      <ApprovalsView status="OVERDUE" title="SLA breached" />
    </div>
  );
}
