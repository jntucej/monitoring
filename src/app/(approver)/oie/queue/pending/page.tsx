"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { RoleStarterGuide } from "@/components/shared/RoleStarterGuide";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";

export default function Page() {
  const [active, setActive] = useState<HMBoardRow | null>(null);
  const inspection = active
    ? boardRowTicketInspection(active, { consoleHref: "/oie/queue/pending", consoleLabel: "Pending queue" })
    : null;
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Officer In-Charge of Examinations"
        purpose="Review and adjudicate pending candidate exam clearance requests."
        why="Prompt adjudication of pending clearance requests ensures hall tickets and gate barcodes are active before sessions start."
        contextLabel="Pending Exam Clearances"
        statusTone="info"
        statusSummary="Adjudicate exam-day hall permits and student clearance approvals."
        primaryAction={{ label: "Escalated Queue", href: "/oie/queue/escalated" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Day Access", href: "/oie/examination-day-access" },
        ]}
      />
      <RoleStarterGuide
        guideId="oie-pending"
        title="How OIE Exam Clearance Works"
        summary="Adjudicate exam-day hall permits and student clearance requests directly from this queue."
        steps={[
          "Check prior stage & reason",
          "Approve, Forward, or Reject",
          "Gate QR updates automatically",
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="OIE"
        forwardLabel="Forward to Principal"
        relatedHref="/oie/examination-day-access"
        relatedLabel="Day Access"
      />
      <KanbanBoard
        source="/api/oie/queue?status=PENDING"
        columns={["PENDING"]}
        itemKey="permission"
        onSelect={(row) => setActive(row as HMBoardRow)}
      />
      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
