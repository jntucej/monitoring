"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
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
        contextLabel="Pending Exam Clearances"
        statusTone="info"
        statusSummary="Adjudicate exam-day hall permits and student clearance approvals."
        primaryAction={{ label: "Escalated Queue", href: "/oie/queue/escalated" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Day Access", href: "/oie/examination-day-access" },
        ]}
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
