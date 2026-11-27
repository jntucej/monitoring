"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { EscalationsView } from "./_shared/EscalationsView";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Primary supervisory command plane for gate operations, security escalations, and guard shifts"
        contextLabel="Supervisory Desk"
        statusSummary="Triage pending frontline gate escalations, review shift handovers, and coordinate guard deployments."
        why="The supervisory command desk centralizes immediate actionable approvals, guard assignments, and active gate escalations."
        primaryAction={{ label: "Shift Handover", href: "/supervisor/shift/handover" }}
        secondaryAction={{ label: "Active Gates", href: "/supervisor/gates/live" }}
      />
      <EscalationsView />
      <SpatialPeopleMapWorkspace defaultArea="security" lockedArea compact />
    </div>
  );
}
