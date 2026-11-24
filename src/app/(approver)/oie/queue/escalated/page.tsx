"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";

export default function Page() {
  const [active, setActive] = useState<HMBoardRow | null>(null);
  const inspection = active
    ? boardRowTicketInspection(active, { consoleHref: "/oie/queue/escalated", consoleLabel: "Escalated queue" })
    : null;
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Officer In-Charge of Examinations"
        purpose="Address escalated exam-day exceptions and urgent verification hold-ups."
        contextLabel="Escalated Exam Queue"
        statusTone="warn"
        statusSummary="Resolve escalated clearance requests requiring executive OIE intervention."
        primaryAction={{ label: "Pending Queue", href: "/oie/queue/pending" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Exceptions", href: "/oie/access-exceptions" },
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="OIE"
        forwardLabel="Forward to Principal"
        relatedHref="/oie/queue/pending"
        relatedLabel="Pending Queue"
      />
      <KanbanBoard
        source="/api/oie/queue?status=ESCALATED"
        columns={["ESCALATED"]}
        itemKey="permission"
        onSelect={(row) => setActive(row)}
      />
      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
