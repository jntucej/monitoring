"use client";

/**
 * Caretaker root page — Board-only.
 *
 * The caretaker layout already mounts the RoleConsole shell. This page just
 * passes a GridBoard of the caretaker summary (grouped by status) through
 * `children`. No KPI cards, no charts, no horizontal scroll.
 */

import { GridBoard } from "@/components/shared/GridBoard";

export default function CaretakerPage() {
  return (
    <GridBoard
      source="/api/caretaker/summary"
      groupBy="status"
      columns={["Open", "In Progress", "Resolved"]}
    />
  );
}
