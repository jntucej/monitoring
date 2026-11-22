"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import type { BoardRow } from "@/components/shared/Board";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { scanInspection } from "@/components/shared/inspectionModels";

export default function Page() {
  const [active, setActive] = useState<BoardRow | null>(null);
  const inspection = active ? scanInspection(active) : null;
  return (
    <div className="space-y-4">
      <KanbanBoard
        source="/api/oie/queue?status=APPROVED"
        columns={["APPROVED", "REJECTED"]}
        itemKey="permission"
        onSelect={(row) => setActive(row)}
      />
      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
