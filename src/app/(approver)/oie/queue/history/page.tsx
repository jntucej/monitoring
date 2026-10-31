"use client";

import { KanbanBoard } from "@/components/shared/KanbanBoard";

export default function Page() {
  return (
    <KanbanBoard
      source="/api/oie/queue?status=APPROVED"
      columns={["APPROVED", "REJECTED"]}
      itemKey="permission"
      onSelect={() => {}}
    />
  );
}
