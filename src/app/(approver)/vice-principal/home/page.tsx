"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useVPRetention } from "@/stores/vpRetentionStore";
import { useVPStreak } from "@/hooks/useVPStreak";
import { MorningBrief } from "../_retention/MorningBrief";
import { FocusZone, type FocusItem } from "../_retention/FocusZone";
import { FocusMode } from "../_retention/FocusMode";
import { Scorecard } from "../_retention/Scorecard";
import { WinFeed } from "../_retention/WinFeed";
import { InsightCard } from "../_retention/InsightCard";
import { LiveClassCard } from "@/components/shared/LiveClassCard";
import { HotSpots, type HotSpot } from "../_retention/HotSpots";
import { UpcomingPreview, type UpcomingItem } from "../_retention/UpcomingPreview";
import { PrincipalBridge } from "../_retention/PrincipalBridge";
import { VpBridgeFlagCard } from "@/components/vp/VpBridgeFlagCard";
import { CelebrateOverlay } from "../_retention/CelebrateOverlay";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { PageHeader } from "@/components/shared/PageHeader";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Greeting } from "@/components/Greeting";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { KpiCard } from "../_shared/KpiCard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { KVPairs, ActionRow, InspectorButton } from "@/components/shared/EntityInspector";

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
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const inspectQueue = (kind: "pending" | "escalated" | "hot") => {
    const pending = d?.counts.pendingApprovals ?? 0;
    const escalated = d?.counts.escalated ?? 0;
    const hot = (d?.hotSpots ?? []).length;
    inspect({
      kind: kind === "pending" ? "escalation" : kind === "escalated" ? "escalation" : "academic_record",
      title:
        kind === "pending"
          ? "Pending approvals"
          : kind === "escalated"
            ? "Escalated requests"
            : "Attendance hot spots",
      subtitle:
        kind === "pending" ? `${pending} in queue` : kind === "escalated" ? `${escalated} escalated` : `${hot} department(s)`,
      sections: [
        {
          title: "Overview",
          content: (
            <KVPairs
              items={
                kind === "hot"
                  ? (d?.hotSpots ?? []).map((s) => ({
                      label: s.department,
                      value: `${s.rate}% absent (${s.absent}/${s.total})`,
                    }))
                  : [
                      { label: "Pending approvals", value: String(pending) },
                      { label: "Escalated", value: String(escalated) },
                    ]
              }
            />
          ),
        },
        {
          title: "Actions",
          content: (
            <ActionRow>
              <InspectorButton
                href={
                  kind === "pending"
                    ? "/vice-principal/pending-approvals"
                    : kind === "escalated"
                      ? "/vice-principal/escalated-requests"
                      : "/vice-principal/academics/exceptions"
                }
                variant="primary"
              >
                Open queue
              </InspectorButton>
            </ActionRow>
          ),
        },
      ],
      detailHref:
        kind === "pending"
          ? "/vice-principal/pending-approvals"
          : kind === "escalated"
            ? "/vice-principal/escalated-requests"
            : "/vice-principal/academics/exceptions",
      detailLabel: "Open queue",
    });
  };

  const {data, refresh} = useApiResource<VPOverview>("/api/vp/dashboard", {
    ttlMs: 15_000,
  });
  usePolling(refresh, { intervalMs: 15_000 });

  // Hydrate today's wins from the server

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
<Greeting />
<RoleOnboarding />
    <>
      <CelebrateOverlay queueEmpty={queueEmpty && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
<PageHeader title="Vice Principal" subtitle="Campus operations & exams" />
        <WidgetBoundary name="VpKpis" title="Vice Principal KPIs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Pending approvals"
              value={d?.counts.pendingApprovals ?? 0}
              onClick={() => inspectQueue("pending")}
              hint="Open the pending queue"
            />
            <KpiCard
              label="Exam day"
              value={d?.counts.examDayState ?? "—"}
              tone={d?.counts.examDayState === "closed" ? "warn" : "ok"}
            />
            <KpiCard
              label="Escalated"
              value={d?.counts.escalated ?? 0}
              tone={(d?.counts.escalated ?? 0) > 0 ? "warn" : "ok"}
              onClick={() => inspectQueue("escalated")}
              hint="Open the escalation queue"
            />
            <KpiCard
              label="Hot spots"
              value={d?.hotSpots?.length ?? 0}
              onClick={() => inspectQueue("hot")}
              hint="Departments with elevated absence"
            />
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
        <div className="section-offscreen">
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

        {/* Live classes — academic surface */}
        <LiveClassCard title="Academic Live" scope="academic" />

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

        {/* 6. Principal Bridge — social proof + the actionable flag */}
        <WidgetBoundary name="PrincipalBridge" title="Principal Bridge">
          <PrincipalBridge
            myPending={d?.principalBridge.myPending ?? 0}
            principalPending={d?.principalBridge.principalPending ?? 0}
          />
        </WidgetBoundary>
        <VpBridgeFlagCard />

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
        </div>

        <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
      </div>
    </>
</>
    );
}
