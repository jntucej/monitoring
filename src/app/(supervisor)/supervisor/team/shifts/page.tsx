"use client";

import { useState } from "react";
import { WorkersView } from "../../_shared/WorkersView";
import { PostTimetableBoard } from "@/components/supervisor/PostTimetableBoard";
import { HierarchyDateSyncBar } from "@/components/nav/HierarchyDateSyncBar";

export default function TeamShiftsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-6">
      <HierarchyDateSyncBar
        role="supervisor"
        snapshot={{
          date,
          presetApplied: "Standard Shift Roster",
          activeOverridesCount: 0,
          uncoveredPostsCount: 0,
          dispatchedGuardsCount: 0,
          pendingStageApprovalsCount: 0,
          urgentEscalationsCount: 0,
          lastSyncedAt: new Date().toISOString(),
        }}
        onDateChange={setDate}
      />
      <PostTimetableBoard assignments={[]} incidents={[]} />
      <WorkersView />
    </div>
  );
}
