"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { EscalationsView } from "./_shared/EscalationsView";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Primary supervisory command plane for gate operations, security escalations, and guard shifts"
        contextLabel="Supervisory Desk"
        statusSummary="Triage pending frontline gate escalations, review shift handovers, and coordinate guard deployments."
        primaryAction={{ label: "Shift Handover", href: "/supervisor/shift/handover" }}
        secondaryAction={{ label: "Active Gates", href: "/supervisor/gates/live" }}
      />
      <EscalationsView />
    </div>
  );
}
