"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApprovalsView } from "./_shared/ApprovalsView";

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-4 min-w-0">
      <ContextSituationBar
        roleLabel="Head of Department"
        purpose="Review and adjudicate pending student permissions and department requests."
        why="HOD endorsement is required for multi-day leaves, academic exemptions, and external project permissions."
        contextLabel="Pending Approvals"
        statusTone="info"
        statusSummary="Evaluate student leave, pass, and permission requests waiting for HOD approval."
        primaryAction={{ label: "Escalated Queue", href: "/hod/approvals/escalated" }}
        secondaryActions={[
          { label: "Today Overview", href: "/hod/home" },
          { label: "Faculty Directory", href: "/hod/faculty/directory" },
        ]}
      />
      <ApprovalsView status="PENDING" title="Pending approvals" />
    </div>
  );
}
