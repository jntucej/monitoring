"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "./_shared/ApprovalsView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Primary executive approvals desk for institutional leaves, gate passes, and academic clearances"
        why="The approvals desk empowers the Vice Principal to review, endorse, or escalate high-impact institutional permissions efficiently."
        contextLabel="Executive Approvals Desk"
        statusSummary="Review and authorize pending student workflow requests, gate passes, and department escalations."
        primaryAction={{ label: "Escalated Requests", href: "/vice-principal/escalated-requests" }}
        secondaryAction={{ label: "VP Dashboard", href: "/vice-principal/home" }}
      />
      <ApprovalsView status="PENDING" title="Pending approvals" />
    </div>
  );
}
