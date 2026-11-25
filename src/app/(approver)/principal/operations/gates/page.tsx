"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { GatesView } from "../../_shared/GatesView";

export default function Page() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Executive oversight of all campus access gates, perimeter security staffing, and transit flow"
        why="Centralized gate monitoring prevents unauthorized perimeter access and balances transit flow across campus entry points."
        contextLabel="Campus Gates Command"
        statusSummary="Monitor real-time guard staffing, gate operational states, and entry/exit transit rates."
        primaryAction={{ label: "Security Incidents", href: "/principal/operations/incidents" }}
        secondaryAction={{ label: "Hostel Oversight", href: "/principal/operations/hostel" }}
      />
      <GatesView />
    </div>
  );
}
