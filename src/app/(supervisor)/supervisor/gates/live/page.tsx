"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";
import { GateActivityView } from "../../_shared/GateActivityView";

export default function GateLivePage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Real-time perimeter surveillance, telemetry monitoring, and gate post activity"
        contextLabel="Live Gate Operations"
        statusSummary="Monitor active gate telemetry, guard station occupancy, and live transit events."
        why="Instant gate telemetry verifies that optical readers, turnstiles, and emergency overrides are online across all portals."
        primaryAction={{ label: "Gate Wall Grid", href: "/supervisor/gates/wall" }}
        secondaryAction={{ label: "Hourly Activity", href: "/supervisor/gates/activity" }}
      />
      <GateActivityView />
      {/* Security domain map — locked to the security area (no 5-tab
          switcher). Live data via GET /api/org-map?area=security. */}
      <WidgetBoundary name="SpatialPeopleMap" title="Security & Gate Footprint">
        <SpatialPeopleMapWorkspace defaultArea="security" lockedArea compact />
      </WidgetBoundary>
    </div>
  );
}
