"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";
import { usePrincipalStreak } from "@/hooks/usePrincipalStreak";
import { MorningBrief } from "./_retention/MorningBrief";
import { FocusZone, type FocusItem } from "./_retention/FocusZone";
import { FocusMode } from "./_retention/FocusMode";
import { ChainImpact } from "./_retention/ChainImpact";
import { DelegationHealth } from "./_retention/DelegationHealth";
import { StrategicScorecard } from "./_retention/StrategicScorecard";
import { WinFeed } from "./_retention/WinFeed";
import { InsightCard } from "./_retention/InsightCard";
import { EmergencyPulse } from "./_retention/EmergencyPulse";
import { UpcomingPreview, type UpcomingItem } from "./_retention/UpcomingPreview";
import { CelebrateOverlay } from "./_retention/CelebrateOverlay";

interface PrincipalOverview {
  success?: boolean;
  data?: {
    counts: {
      pending: number;
      escalated: number;
      overdue: number;
      todayDecisions: number;
    };
    priorityItems: Array<{
      id: string;
      kind: "emergency" | "escalation" | "approval";
      ticket: string;
      subject: string;
      slaDeadline: string | null;
      age: string;
      href: string;
    }>;
    chainImpact: { students: number; faculty: number; total: number };
    delegations: { active: number; expiringSoon: number };
    emergency: Array<{ ticket: string; subject: string; age: string }>;
    exams: { pendingClearances: number; todayCandidates: number };
  };
}

export default function PrincipalTodayPage() {
  const [focusOpen, setFocusOpen] = useState(false);
  const { data, refresh } = useApiResource<PrincipalOverview>("/api/principal/dashboard", {
    ttlMs: 15_000,
  });
  usePolling(refresh, { intervalMs: 15_000 });

  const sessionDecisions = usePrincipalRetention((s) => s.sessionDecisions);

  const d = data?.data;
  const pending =
    (d?.counts.pending ?? 0) +
    (d?.counts.escalated ?? 0) +
    (d?.counts.overdue ?? 0);
  const zeroOverdue = (d?.counts.overdue ?? 0) === 0;

  usePrincipalStreak(zeroOverdue, pending);

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
      ? d.priorityItems
          .filter((i) => i.slaDeadline)
          .slice(0, 5)
          .map((i) => ({
            ticket: i.ticket,
            subject: i.subject,
            slaDeadline: i.slaDeadline!,
            workflowType: "",
          }))
      : [];

  return (
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="space-y-4">
        {/* 1. Emergency pulse — only when present, top priority */}
        {d?.emergency && d.emergency.length > 0 && (
          <EmergencyPulse items={d.emergency} />
        )}

        {/* 2. Morning brief — greeting + streak + daily progress */}
        <MorningBrief
          pending={pending}
          cleared={d?.counts.todayDecisions ?? 0}
          target={Math.max(5, pending + (d?.counts.todayDecisions ?? 0))}
        />

        {/* 3. Focus zone — the one item that matters right now */}
        <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />

        {/* 4. Chain impact + Delegation health — the leverage view */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChainImpact
            students={d?.chainImpact.students ?? 0}
            faculty={d?.chainImpact.faculty ?? 0}
            total={d?.chainImpact.total ?? 0}
          />
          <DelegationHealth
            active={d?.delegations.active ?? 0}
            expiringSoon={d?.delegations.expiringSoon ?? 0}
          />
        </div>

        {/* 5. Scorecard — personal bests */}
        <StrategicScorecard
          thisWeek={d?.counts.todayDecisions ?? 0}
          lastWeek={0}
          avgResponseSec={0}
        />

        {/* 6. Wins + Insight */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WinFeed />
          <InsightCard
            thisWeek={d?.counts.todayDecisions ?? 0}
            lastWeek={0}
            avgResponseSec={0}
            chainTotal={d?.chainImpact.total ?? 0}
          />
        </div>

        {/* 7. Upcoming — SLA deadlines within 24h */}
        <UpcomingPreview items={upcoming} />
      </div>
    </>
  );
}
