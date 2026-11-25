"use client";

import { useSearchParams } from "next/navigation";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { ApprovalsView } from "../_shared/ApprovalsView";

export default function PrincipalApprovalsPage() {
  const searchParams = useSearchParams();
  const workflowType = searchParams.get("workflowType") ?? undefined;
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Highest-level authority for campus leaves, institutional permissions, and security overrides"
        why="Principal approval is required for institutional leaves, external activities, and high-tier security overrides across campus."
        contextLabel="Institutional Approvals Register"
        statusSummary="Review, approve, or delegate pending student leave, gate pass, and event permission tickets."
        primaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        secondaryAction={{ label: "Decision Ledger", href: "/principal/decisions" }}
      />
      <ApproverDecisionQueue
        roleLabel="Principal"
        forwardLabel="Escalate / Delegate"
        relatedHref="/principal/approvals/escalated"
        relatedLabel="Escalated Queue"
      />
      <ApprovalsView status="PENDING" title="Pending approvals" workflowType={workflowType} />
    </div>
  );
}
