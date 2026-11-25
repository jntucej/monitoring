"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";

export default function Page() {
  const [active, setActive] = useState<HMBoardRow | null>(null);
  const inspection = active
    ? boardRowTicketInspection(active, { consoleHref: "/oie/queue/history", consoleLabel: "Queue history" })
    : null;
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Officer In-Charge of Examinations"
        purpose="Audit completed clearance decisions and historical examination permit outcomes."
        why="A historical decision trail ensures transparency and accountability for all granted or denied hall access clearances."
        contextLabel="Queue History"
        statusTone="info"
        statusSummary="Search and review past clearance verdicts, timestamps, and approver logs."
        primaryAction={{ label: "Pending Queue", href: "/oie/queue/pending" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Decision History", href: "/oie/decision-history" },
        ]}
      />
      <KanbanBoard
        source="/api/oie/queue?status=APPROVED"
        columns={["APPROVED", "REJECTED"]}
        itemKey="permission"
        onSelect={(row) => setActive(row as HMBoardRow)}
      />
      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
