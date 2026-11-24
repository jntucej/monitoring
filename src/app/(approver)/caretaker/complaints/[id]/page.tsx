"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <ContextSituationBar
        roleLabel="Caretaker"
        purpose="Investigate assigned facility complaints, record physical repairs, and update ticket resolution status"
        contextLabel="Complaint Inspection & Repair"
        statusSummary="Inspect reported facility defects, log on-site worker actions, and resolve hostel maintenance tickets."
        severity="info"
        primaryAction={{ label: "Maintenance Queue", href: "/caretaker/maintenance" }}
        secondaryActions={[
          { label: "All Complaints", href: "/caretaker" },
          { label: "Workers Status", href: "/caretaker/workers" },
        ]}
      />
      <ComplaintDetail role="caretaker" />
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
