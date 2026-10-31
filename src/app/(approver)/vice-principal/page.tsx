"use client";

import { useCallback, useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useVPRetention } from "@/stores/vpRetentionStore";
import { useVPStreak } from "@/hooks/useVPStreak";
import { MorningBrief } from "./_retention/MorningBrief";
import { FocusZone, type FocusItem } from "./_retention/FocusZone";
import { FocusMode } from "./_retention/FocusMode";
import { Scorecard } from "./_retention/Scorecard";
import { WinFeed } from "./_retention/WinFeed";
import { InsightCard } from "./_retention/InsightCard";
import { HotSpots, type HotSpot } from "./_retention/HotSpots";
import { UpcomingPreview, type UpcomingItem } from "./_retention/UpcomingPreview";
import { PrincipalBridge } from "./_retention/PrincipalBridge";
import { CelebrateOverlay } from "./_retention/CelebrateOverlay";

interface VPOverview {
  success?: boolean;
  data?: {
    counts: {
      pendingApprovals: number;
      escalated: number;
      todayDecisions: number;
      examDayState: "open" | "closed";
    };
    priorityItems: Array<{
      id: string;
      kind: "approval" | "escalation" | "exception";
      ticket: string;
      subject: string;
      slaDeadline: string | null;
      age: string;
      href: string;
    }>;
    insights: {
      thisWeek: number;
      lastWeek: number;
      avgResponseSec: number;
    };
    hotSpots: HotSpot[];
    upcoming: UpcomingItem[];
    principalBridge: {
      myPending: number;
      principalPending: number;
    };
  };
}

export default function VPTodayPage() {
  const [focusOpen, setFocusOpen] = useState(false);

  const { data, loading, refresh } = useApiResource<VPOverview>("/api/vp/dashboard", {
    ttlMs: 15_000,
  });
  usePolling(refresh, { intervalMs: 15_000 });

  // Hydrate today's wins from the server
  const todayWins = useVPRetention((s) => s.todayWins);
  const sessionDecisions = useVPRetention((s) => s.sessionDecisions);

  const d = data?.data;
  const pending = (d?.counts.pendingApprovals ?? 0) + (d?.counts.escalated ?? 0);

  // Streak hook — needs zero-overdue + pending count
  const zeroOverdue = pending === 0;
  useVPStreak(zeroOverdue, pending);

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

  const todayCleared = d?.counts.todayDecisions ?? 0;
  const dailyTarget = Math.max(5, pending + todayCleared);

  const queueEmpty = pending === 0;

  return (
    <>
      <CelebrateOverlay queueEmpty={queueEmpty && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="space-y-4">
        {/* 1. Morning Brief — greeting + streak + progress */}
        <MorningBrief
          pending={pending}
          cleared={todayCleared}
          target={dailyTarget}
        />

        {/* 2. Focus Zone — the one thing right now */}
        <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />

        {/* 3. Scorecard — your week, your bests */}
        <Scorecard
          thisWeek={d?.insights.thisWeek ?? 0}
          lastWeek={d?.insights.lastWeek ?? 0}
          avgResponseSec={d?.insights.avgResponseSec ?? 0}
        />

        {/* 4. Two-up: Wins + Insight */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WinFeed />
          <InsightCard
            thisWeek={d?.insights.thisWeek ?? 0}
            lastWeek={d?.insights.lastWeek ?? 0}
            avgResponseSec={d?.insights.avgResponseSec ?? 0}
          />
        </div>

        {/* 5. Hot spots + Due soon — two-up on desktop */}
        <div className="grid gap-4 lg:grid-cols-2">
          <HotSpots spots={d?.hotSpots ?? []} />
          <UpcomingPreview items={d?.upcoming ?? []} />
        </div>

        {/* 6. Principal Bridge — social proof */}
        <PrincipalBridge
          myPending={d?.principalBridge.myPending ?? 0}
          principalPending={d?.principalBridge.principalPending ?? 0}
        />
      </div>
    </>
  );
}
