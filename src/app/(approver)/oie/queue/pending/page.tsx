"use client";

import { KanbanBoard } from "@/components/shared/KanbanBoard";

export default function Page() {
  return (
    <KanbanBoard
      source="/api/oie/queue?status=PENDING"
      columns={["PENDING"]}
      itemKey="permission"
      onSelect={() => {}}
    />
  );
}
