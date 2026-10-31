"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { useSupervisorShift } from "@/hooks/useSupervisorShift";
import { ShiftBar } from "./_retention/ShiftBar";
import { FocusZone, type FocusItem } from "./_retention/FocusZone";
import { FocusMode } from "./_retention/FocusMode";
import { TeamRoster } from "./_retention/TeamRoster";
import { GateWall } from "./_retention/GateWall";
import { HandoverStreak } from "./_retention/HandoverStreak";
import { Scorecard } from "./_retention/Scorecard";
import { WinFeed } from "./_retention/WinFeed";
import { InsightCard } from "./_retention/InsightCard";
import { UpcomingPreview, type UpcomingItem } from "./_retention/UpcomingPreview";
import { CelebrateOverlay } from "./_retention/CelebrateOverlay";

interface SupervisorOverview {
  counts: {
    escalationsOpen: number;
    incidentsOpen: number;
    exceptionsToday: number;
    resolvedToday: number;
  };
  priorityItems: Array<{
    id: string;
    kind: "escalation" | "incident";
    ticket: string;
    subject: string;
    slaDeadline: string | null;
    age: string;
    href: string;
  }>;
  gates: Array<{
    id: string;
    name: string;
    isActive: boolean;
    onPost: number;
    lastActivity: string | null;
  }>;
  incidents: Array<{
    id: string;
    severity: string;
    title: string;
    timestamp: string;
    resolved: boolean;
  }>;
  shift: {
    shiftId: string | null;
    startedAt: string | null;
    endsAt: string | null;
  };
}

export default function SupervisorTodayPage() {
  const [focusOpen, setFocusOpen] = useState(false);
  const { data, refresh } = useApiResource<{ data: SupervisorOverview }>(
    "/api/supervisor/dashboard",
    { ttlMs: 15_000 }
  );
  usePolling(refresh, { intervalMs: 15_000 });

  const sessionDecisions = useSupervisorRetention((s) => s.sessionDecisions);

  const d = data?.data;
  const escalationsOpen = d?.counts.escalationsOpen ?? 0;
  const incidentsOpen = d?.counts.incidentsOpen ?? 0;
  const pending = escalationsOpen + incidentsOpen;

  useSupervisorShift({
    shiftId: d?.shift.shiftId ?? null,
    shiftStartedAt: d?.shift.startedAt ?? null,
    shiftEndsAt: d?.shift.endsAt ?? null,
  });

  const focusItem: FocusItem | null = useMemo(() => {
    if (!d?.priorityItems || d.priorityItems.length === 0) return null;
    const first = d.priorityItems[0];
    return {
      id: first.id,
      ticket: first.ticket,
      subject: first.subject,
      slaDeadline: first.slaDeadline,
      age: first.age,
      href: first.href,
    };
  }, [d?.priorityItems]);

  const upcoming: UpcomingItem[] =
    d?.priorityItems
      .filter((i) => i.slaDeadline)
      .slice(0, 5)
      .map((i) => ({
        ticket: i.ticket,
        subject: i.subject,
        slaDeadline: i.slaDeadline!,
        workflowType: "",
      })) ?? [];

  const totalGates = d?.gates.length ?? 0;
  const gatesOnline = d?.gates.filter((g) => g.isActive && g.onPost > 0).length ?? 0;
  const securityOnDuty = 0; // enriched by TeamRoster's own fetch

  return (
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="space-y-4">
        {/* 1. Shift bar — shift-aware, not day-aware */}
        <ShiftBar
          startedAt={d?.shift.startedAt ?? null}
          endsAt={d?.shift.endsAt ?? null}
          escalationsOpen={escalationsOpen}
          incidentsOpen={incidentsOpen}
        />

        {/* 2. Focus zone — the one thing to clear right now */}
        <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />

        {/* 3. Team + Gates — the two things a supervisor watches */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamRoster />
          <GateWall gates={d?.gates ?? []} />
        </div>

        {/* 4. Handover streak — supervisor-specific */}
        <HandoverStreak />

        {/* 5. Scorecard */}
        <Scorecard
          thisWeek={d?.counts.resolvedToday ?? 0}
          lastWeek={0}
          avgResponseSec={0}
        />

        {/* 6. Wins + Insight */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WinFeed />
          <InsightCard
            escalationsOpen={escalationsOpen}
            incidentsOpen={incidentsOpen}
            gatesOnline={gatesOnline}
            totalGates={totalGates}
            securityOnDuty={securityOnDuty}
          />
        </div>

        {/* 7. Upcoming — SLA deadlines */}
        <UpcomingPreview items={upcoming} />
      </div>
    </>
  );
}
