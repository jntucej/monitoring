"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { GateActivityView } from "../../_shared/GateActivityView";

export default function GateLivePage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Real-time perimeter surveillance, telemetry monitoring, and gate post activity"
        contextLabel="Live Gate Operations"
        statusSummary="Monitor active gate telemetry, guard station occupancy, and live transit events."
        primaryAction={{ label: "Gate Wall Grid", href: "/supervisor/gates/wall" }}
        secondaryAction={{ label: "Hourly Activity", href: "/supervisor/gates/activity" }}
      />
      <GateActivityView />
    </div>
  );
}
