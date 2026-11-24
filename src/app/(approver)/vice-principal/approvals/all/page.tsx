"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "../../_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Complete administrative overview of all institutional permissions, leaves, and gate passes"
        contextLabel="Consolidated Approvals Register"
        statusSummary="Audit all open, in-review, and approved institutional workflow requests across departments."
        primaryAction={{ label: "Pending Approvals", href: "/vice-principal/pending-approvals" }}
        secondaryAction={{ label: "Escalated Requests", href: "/vice-principal/escalated-requests" }}
      />
      <ApprovalsView status="ALL" title="All open approvals" />
    </div>
  );
}
