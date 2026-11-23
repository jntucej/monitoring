"use client";

import { ComplaintDetail } from "@/components/complaints/ComplaintDetail";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useRoleInspectorHost } from "@/components/shared/roleInspectors";

/**
 * Caretaker complaint detail (the deepest layer of the inspection
 * hierarchy). On top of the full detail panel we keep the standardized
 * inspector host so a complaint opened *from the list* (kind "request")
 * preserves its context and offers the back-link to the maintenance
 * console. Actions live exclusively in the ComplaintDetail panel,
 * wired to PATCH /api/complaints/[id] (caretaker role is on the
 * complaint-task owner chain).
 */
export default function Page() {
  const { inspection, closeInspection } = useRoleInspectorHost();

  return (
    <>
      <ComplaintDetail role="caretaker" />
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </>
  );
}
