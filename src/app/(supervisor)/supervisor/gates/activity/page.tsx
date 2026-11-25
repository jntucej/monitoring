"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { GateActivityView } from "../../_shared/GateActivityView";

export default function GateActivityPage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Monitor live gate operations, entry and exit flow volumes, and guard post occupancy"
        contextLabel="Gate Activity Stream"
        statusSummary="Track real-time hourly movement counts and guard coverage across all supervised campus gates."
        why="Hourly movement streams reveal bottlenecked gates and allow dynamic redeployment of guard staff before surges accumulate."
        primaryAction={{ label: "Live Wall", href: "/supervisor/gates/live" }}
        secondaryAction={{ label: "Curfew Roster", href: "/supervisor/team/curfew" }}
      />
      <GateActivityView />
    </div>
  );
}
