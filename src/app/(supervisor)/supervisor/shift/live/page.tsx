"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ShiftLiveView } from "../../_shared/ShiftLiveView";

export default function ShiftLivePage() {
  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Live shift tracking, active guard allocations, and real-time station roster monitoring"
        contextLabel="Active Shift Operations"
        statusSummary="Monitor current guard post coverage, station check-ins, and shift duration countdowns."
        primaryAction={{ label: "Shift Handover", href: "/supervisor/shift/handover" }}
        secondaryAction={{ label: "Guard Roster", href: "/supervisor/team/shifts" }}
      />
      <ShiftLiveView />
    </div>
  );
}
