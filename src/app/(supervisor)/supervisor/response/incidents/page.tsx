"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { IncidentsView } from "../../_shared/IncidentsView";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector } from "@/components/shared/useEntityInspector";

export default function IncidentsPage() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Investigate and record security incidents, unauthorized perimeter crossings, and contraband alerts"
        contextLabel="Security Incident Center"
        statusSummary="Active register of campus perimeter violations, security breaches, and emergency response actions."
        why="Logging and responding to active incidents triggers containment protocols and alerts executive security personnel."
        severity="critical"
        primaryAction={{ label: "Escalations Desk", href: "/supervisor/response/escalations" }}
        secondaryAction={{ label: "Live Gates", href: "/supervisor/gates/live" }}
      />
      <ApproverDecisionQueue
        roleLabel="Gate Supervisor"
        forwardLabel="Escalate to VP"
        relatedHref="/supervisor/gates/live"
        relatedLabel="Live Gates"
      />
      <IncidentsView onInspect={inspect} />
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
