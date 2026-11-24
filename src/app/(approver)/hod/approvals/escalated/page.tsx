"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
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
      <ApprovalsView status="ESCALATED" title="Escalated to you" />
    </div>
  );
}
