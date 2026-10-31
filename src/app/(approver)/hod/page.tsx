"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useHodRetention } from "@/stores/hodRetentionStore";
import { useHodStreak } from "@/hooks/useHodStreak";
import { MorningBrief } from "./_retention/MorningBrief";
import { BetweenClasses, type ScheduleSlot } from "./_retention/BetweenClasses";
import { FocusZone, type FocusItem } from "./_retention/FocusZone";
import { FocusMode } from "./_retention/FocusMode";
import { DepartmentPulse } from "./_retention/DepartmentPulse";
import { FacultyCare } from "./_retention/FacultyCare";
import { ImpactCard } from "./_retention/ImpactCard";
import { Scorecard } from "./_retention/Scorecard";
import { WinFeed } from "./_retention/WinFeed";
import { InsightCard } from "./_retention/InsightCard";
import { UpcomingPreview, type UpcomingItem } from "./_retention/UpcomingPreview";
import { CelebrateOverlay } from "./_retention/CelebrateOverlay";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

interface PriorityItem {
  id: string;
  ticket: string;
  subject: string;
  slaDeadline: string | null;
  age: string;
  href: string;
  impactedStudents: number;
}

interface HodOverviewData {
  counts: {
    pending: number;
    escalated: number;
    overdue: number;
    todayDecisions: number;
  };
  priorityItems: PriorityItem[];
  faculty: {
    total: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    needsAttention: number;
  };
  students: { total: number; onCampus: number; offCampus: number };
  pulse: {
    myRate: number;
    collegeAvg: number;
    myRank: number;
    totalDepts: number;
  };
  schedule: ScheduleSlot[];
}

interface HodOverviewResponse {
  success?: boolean;
  data?: HodOverviewData;
}

export default function HodTodayPage() {
  const [focusOpen, setFocusOpen] = useState(false);
  const { data, refresh } = useApiResource<HodOverviewResponse>("/api/hod/dashboard", {
    ttlMs: 20_000,
  });
  usePolling(refresh, { intervalMs: 20_000 });

  const sessionDecisions = useHodRetention((s) => s.sessionDecisions);

  const d = data?.data;
  const pending =
    (d?.counts.pending ?? 0) +
    (d?.counts.escalated ?? 0) +
    (d?.counts.overdue ?? 0);

  const allClassesMarked =
    (d?.schedule ?? []).length > 0 && (d?.schedule ?? []).every((s: ScheduleSlot) => s.marked);
  const zeroFacultyEscalations = (d?.faculty.needsAttention ?? 0) === 0;
  const zeroPendingApprovals = pending === 0;

  useHodStreak({
    allClassesMarked,
    zeroFacultyEscalations,
    zeroPendingApprovals,
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
      .filter((i: PriorityItem) => Boolean(i.slaDeadline))
      .slice(0, 5)
      .map((i: PriorityItem) => ({
        ticket: i.ticket,
        subject: i.subject,
        slaDeadline: i.slaDeadline!,
        workflowType: "",
      })) ?? [];

  return (
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="space-y-4">
        {/* 1. Morning brief — greeting + dual streaks + progress */}
        <WidgetBoundary name="MorningBrief" title="Morning Brief">
          <MorningBrief
            pending={pending}
            cleared={d?.counts.todayDecisions ?? 0}
            target={Math.max(5, pending + (d?.counts.todayDecisions ?? 0))}
          />
        </WidgetBoundary>

        {/* 2. Between classes — teaching rhythm */}
        <WidgetBoundary name="BetweenClasses" title="Between Classes">
          <BetweenClasses
            schedule={d?.schedule ?? []}
            pendingCount={pending}
          />
        </WidgetBoundary>

        {/* 3. Focus zone — the one thing to clear right now */}
        <WidgetBoundary name="FocusZone" title="Focus Zone">
          <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />
        </WidgetBoundary>

        {/* 4. Department pulse + Faculty care — the care view */}
        <WidgetBoundary name="PulseAndCare" title="Department Pulse & Faculty Care">
          <div className="grid gap-4 md:grid-cols-2">
            <DepartmentPulse
              myRate={d?.pulse.myRate ?? 0}
              collegeAvg={d?.pulse.collegeAvg ?? 0}
              myRank={d?.pulse.myRank ?? 0}
              totalDepts={d?.pulse.totalDepts ?? 0}
            />
            <FacultyCare
              total={d?.faculty.total ?? 0}
              presentToday={d?.faculty.presentToday ?? 0}
              lateToday={d?.faculty.lateToday ?? 0}
              absentToday={d?.faculty.absentToday ?? 0}
            />
          </div>
        </WidgetBoundary>

        {/* 5. Student impact */}
        <WidgetBoundary name="ImpactCard" title="Student Impact">
          <ImpactCard
            studentsTotal={d?.students.total ?? 0}
            onCampus={d?.students.onCampus ?? 0}
            decisionsToday={d?.counts.todayDecisions ?? 0}
          />
        </WidgetBoundary>

        {/* 6. Scorecard */}
        <WidgetBoundary name="Scorecard" title="Scorecard">
          <Scorecard
            thisWeek={d?.counts.todayDecisions ?? 0}
            lastWeek={0}
            avgResponseSec={0}
          />
        </WidgetBoundary>

        {/* 7. Wins + Insight */}
        <WidgetBoundary name="WinsAndInsights" title="Wins & Insights">
          <div className="grid gap-4 md:grid-cols-2">
            <WinFeed />
            <InsightCard
              facultyNeedsAttention={d?.faculty.needsAttention ?? 0}
              pendingApprovals={pending}
              departmentRank={d?.pulse.myRank ?? 0}
              totalDepts={d?.pulse.totalDepts ?? 0}
            />
          </div>
        </WidgetBoundary>

        {/* 8. Upcoming */}
        <WidgetBoundary name="UpcomingPreview" title="Upcoming Preview">
          <UpcomingPreview items={upcoming} />
        </WidgetBoundary>

        {/* 9. Retention & Analytics Widgets */}
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
      </div>
    </>
  );
}
