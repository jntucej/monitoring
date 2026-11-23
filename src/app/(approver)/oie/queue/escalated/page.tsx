"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";

export default function Page() {
  const [active, setActive] = useState<HMBoardRow | null>(null);
  const inspection = active
    ? boardRowTicketInspection(active, { consoleHref: "/oie/queue/escalated", consoleLabel: "Escalated queue" })
    : null;
  return (
    <div className="space-y-4">
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
