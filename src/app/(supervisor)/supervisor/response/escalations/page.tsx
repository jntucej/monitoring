"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { EscalationsView } from "../../_shared/EscalationsView";

export default function EscalationsPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Resolve security and transit exceptions escalated directly from frontline gate operators"
        contextLabel="Gate Escalations"
        statusSummary="Triage escalated transit exceptions, override lockouts, and authorize manual student clearances."
        why="Direct supervisor intervention resolves blocked gate queues when students have valid exceptional permissions."
        severity="warn"
        primaryAction={{ label: "Incident Log", href: "/supervisor/response/incidents" }}
        secondaryAction={{ label: "Active Gates", href: "/supervisor/gates/live" }}
      />
      <EscalationsView />
    </div>
  );
}
