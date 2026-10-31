"use client";

import { KanbanBoard } from "@/components/shared/KanbanBoard";

export default function Page() {
  return (
    <KanbanBoard
      source="/api/oie/queue?status=ESCALATED"
      columns={["ESCALATED"]}
      itemKey="permission"
      onSelect={() => {}}
    />
  );
}
