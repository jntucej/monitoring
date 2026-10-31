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
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { PageHeader } from "@/components/shared/PageHeader";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { DevContactStrip } from "@/components/shared/DevContactStrip";


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


function KpiTile({ label, value, tone = "ok" }: { label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-[var(--text-primary)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
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

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
<PageHeader title="Vice Principal" subtitle="Campus operations & exams" />
        <WidgetBoundary name="VpKpis" title="Vice Principal KPIs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile label="Pending approvals" value={d?.counts.pendingApprovals ?? 0} />
            <KpiTile label="Exam day" value={d?.counts.examDayState ?? "—"} tone={d?.counts.examDayState === "closed" ? "warn" : "ok"} />
            <KpiTile label="Escalated" value={d?.counts.escalated ?? 0} tone={(d?.counts.escalated ?? 0) > 0 ? "warn" : "ok"} />
            <KpiTile label="Hot spots" value={d?.hotSpots?.length ?? 0} />
          </div>
        </WidgetBoundary>
                {/* 1. Morning Brief — greeting + streak + progress */}
        <WidgetBoundary name="MorningBrief" title="Morning Brief">
          <MorningBrief
            pending={pending}
            cleared={todayCleared}
            target={dailyTarget}
          />
        </WidgetBoundary>

        {/* 2. Focus Zone — the one thing right now */}
        <WidgetBoundary name="FocusZone" title="Focus Zone">
          <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />
        </WidgetBoundary>

        {/* 3. Scorecard — your week, your bests */}
        <WidgetBoundary name="Scorecard" title="Scorecard">
          <Scorecard
            thisWeek={d?.insights.thisWeek ?? 0}
            lastWeek={d?.insights.lastWeek ?? 0}
            avgResponseSec={d?.insights.avgResponseSec ?? 0}
          />
        </WidgetBoundary>

        {/* 4. Two-up: Wins + Insight */}
        <WidgetBoundary name="WinsAndInsights" title="Wins & Insights">
          <div className="grid gap-4 md:grid-cols-2">
            <WinFeed />
            <InsightCard
              thisWeek={d?.insights.thisWeek ?? 0}
              lastWeek={d?.insights.lastWeek ?? 0}
              avgResponseSec={d?.insights.avgResponseSec ?? 0}
            />
          </div>
        </WidgetBoundary>

        {/* 5. Hot spots + Due soon — two-up on desktop */}
        <WidgetBoundary name="HotSpotsAndUpcoming" title="Hot Spots & Upcoming">
          <div className="grid gap-4 md:grid-cols-2">
            <HotSpots spots={d?.hotSpots ?? []} />
            <UpcomingPreview items={d?.upcoming ?? []} />
          </div>
        </WidgetBoundary>

        {/* 6. Principal Bridge — social proof */}
        <WidgetBoundary name="PrincipalBridge" title="Principal Bridge">
          <PrincipalBridge
            myPending={d?.principalBridge.myPending ?? 0}
            principalPending={d?.principalBridge.principalPending ?? 0}
          />
        </WidgetBoundary>

        {/* 7. Retention & Analytics Widgets */}
        <WidgetBoundary name="RoleAnalytics" title="Role Analytics">
          <RoleAnalytics />
        </WidgetBoundary>

        <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
          <PersonalizedCampusHome />
        </WidgetBoundary>

        <WidgetBoundary name="TaskContinuity" title="Task Continuity">
          <TaskContinuity />
        </WidgetBoundary>

        <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
          <UnifiedCampusCalendar />
        </WidgetBoundary>
<WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
          <DevContactStrip />

      </div>
    </>
  );
}
