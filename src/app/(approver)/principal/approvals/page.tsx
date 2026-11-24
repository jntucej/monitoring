"use client";

import { useSearchParams } from "next/navigation";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../_shared/ApprovalsView";

export default function PrincipalApprovalsPage() {
  const searchParams = useSearchParams();
  const workflowType = searchParams.get("workflowType") ?? undefined;
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Highest-level authority for campus leaves, institutional permissions, and security overrides"
        contextLabel="Institutional Approvals Register"
        statusSummary="Review, approve, or delegate pending student leave, gate pass, and event permission tickets."
        primaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        secondaryAction={{ label: "Decision Ledger", href: "/principal/decisions" }}
      />
      <ApprovalsView status="PENDING" title="Pending approvals" workflowType={workflowType} />
    </div>
  );
}
