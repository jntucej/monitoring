"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WorkersView } from "../../_shared/WorkersView";

export default function WorkersPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Supervise security guard personnel, verify on-duty station status, and allocate relief staff"
        contextLabel="Guard Personnel Roster"
        statusSummary="Active duty status of all perimeter guards, gate operators, and patrol personnel."
        why="Direct guard oversight ensures post accountability, verifies active terminal check-ins, and tracks worker contact details."
        primaryAction={{ label: "Shift Schedule", href: "/supervisor/team/shifts" }}
        secondaryAction={{ label: "Curfew Oversight", href: "/supervisor/team/curfew" }}
      />
      <WorkersView />
    </div>
  );
}
