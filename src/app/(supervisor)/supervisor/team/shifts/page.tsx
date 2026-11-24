"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useState } from "react";
import { WorkersView } from "../../_shared/WorkersView";
import { PostTimetableBoard } from "@/components/supervisor/PostTimetableBoard";
import { HierarchyDateSyncBar } from "@/components/nav/HierarchyDateSyncBar";

export default function TeamShiftsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Plan, schedule, and balance security guard coverage across campus posts and gates"
        contextLabel="Shift Scheduling Board"
        statusSummary="Manage guard timetables, post coverage allocations, and resolve vacant perimeter stations."
        primaryAction={{ label: "Workers Roster", href: "/supervisor/team/workers" }}
        secondaryAction={{ label: "Curfew Roster", href: "/supervisor/team/curfew" }}
      />
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
