"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { HostelView } from "../../_shared/HostelView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Hostel residential governance, warden curfew compliance monitoring, and overnight presence audit"
        why="Residential hostel oversight ensures warden accountability, curfew compliance, and student living safety standards."
        contextLabel="Residential Hostel Operations"
        statusSummary="Supervise hostel block occupancy, curfew compliance rates, and warden night reports."
        primaryAction={{ label: "Issue Direct Pass", href: "/principal/passes" }}
        secondaryAction={{ label: "Gates Command", href: "/principal/operations/gates" }}
      />
      <HostelView />
    </div>
  );
}
