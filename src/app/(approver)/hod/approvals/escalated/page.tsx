"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function EscalatedApprovalsPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Address high-priority and escalated approvals forwarded from faculty or security gates."
        contextLabel="Escalated Approvals"
        statusTone="warn"
        statusSummary="Expedite escalated and SLA-breached requests requiring department head intervention."
        primaryAction={{ label: "Pending Queue", href: "/hod" }}
        secondaryActions={[
          { label: "Today Overview", href: "/hod/home" },
          { label: "Faculty Directory", href: "/hod/faculty/directory" },
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="HOD"
        forwardLabel="Forward to Vice Principal"
        relatedHref="/hod/approvals/pending"
        relatedLabel="Pending Queue"
      />
      <ApprovalsView status="ESCALATED" title="Escalated to you" />
    </div>
  );
}
