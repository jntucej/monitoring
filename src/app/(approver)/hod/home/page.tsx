"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useHodRetention } from "@/stores/hodRetentionStore";
import { useHodStreak } from "@/hooks/useHodStreak";
import { MorningBrief } from "../_retention/MorningBrief";
import { BetweenClasses, type ScheduleSlot } from "../_retention/BetweenClasses";
import { FocusZone, type FocusItem } from "../_retention/FocusZone";
import { FocusMode } from "../_retention/FocusMode";
import { DepartmentPulse } from "../_retention/DepartmentPulse";
import { FacultyCare } from "../_retention/FacultyCare";
import { ImpactCard } from "../_retention/ImpactCard";
import { LiveClassCard } from "@/components/shared/LiveClassCard";
import { Scorecard } from "../_retention/Scorecard";
import { WinFeed } from "../_retention/WinFeed";
import { InsightCard } from "../_retention/InsightCard";
import { DeptClassReviewsCard } from "@/components/hod/DeptClassReviewsCard";
import { UpcomingPreview, type UpcomingItem } from "../_retention/UpcomingPreview";
import { CelebrateOverlay } from "../_retention/CelebrateOverlay";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Greeting } from "@/components/Greeting";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

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


function KpiTile({
  label,
  value,
  tone = "ok",
  linkHref,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
  /** (UX-006) Drill-down target: makes the tile a link to the underlying
   *  records so "I see a number, now what?" is answered in one click. */
  linkHref?: string;
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-400"
      : tone === "warn"
        ? "text-action-warning"
        : "text-text-primary";
  const tile = (
    <div className="surface-card bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
  if (linkHref) {
    return (
      <a
        href={linkHref}
        aria-label={`${label}: ${value}. View records`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary transition-colors hover:bg-[var(--bg-elev-2)]"
      >
        {tile}
      </a>
    );
  }
  return tile;
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

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
<Greeting />
        <RoleOnboarding />
<PageHeader title="Head of Department" subtitle="Department leadership console" />
        <ContextSituationBar
          roleLabel="Head of Department"
          purpose="Oversee department academic operations, faculty attendance, and escalation queues."
          contextLabel="Leadership Console"
          statusTone={pending > 0 ? "warn" : "ok"}
          statusPill={pending > 0 ? `${pending} pending` : "All clear"}
          statusSummary={
            pending > 0
              ? `${pending} pending approval${pending === 1 ? "" : "s"} require department leadership review.`
              : "No pending approval requests requiring department action today."
          }
          primaryAction={{ label: "Approvals Queue", href: "/hod", badgeCount: pending }}
          secondaryActions={[
            { label: "Faculty Directory", href: "/hod/faculty/directory" },
            { label: "Department Reports", href: "/hod/reports" },
          ]}
        />
      <LivePulseStrip items={[{ id: "queue", label: "HOD Queue", valueLabel: "Live", tone: "warn", benchmark: "Review pending department requests" }, { id: "sla", label: "SLA Target", valueLabel: "< 2h", tone: "info", benchmark: "Forward approved passes to VP" }]} />
        <WidgetBoundary name="HodKpis" title="HOD KPIs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile label="Pending approvals" value={d?.counts.pending ?? 0} linkHref="/hod/approvals" />
            <KpiTile label="Escalated" value={d?.counts.escalated ?? 0} tone={(d?.counts.escalated ?? 0) > 0 ? "warn" : "ok"} linkHref="/hod/approvals" />
            <KpiTile label="Faculty present" value={d?.faculty.total ? `${d.faculty.presentToday}/${d.faculty.total}` : "—"} linkHref="/hod/faculty/directory" />
            <KpiTile label="Dept rank" value={d?.pulse.myRank ? `#${d.pulse.myRank}/${d.pulse.totalDepts}` : "—"} linkHref="/hod/reports" />
          </div>
        </WidgetBoundary>
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

        {/* Live classes — department academic surface */}
        <LiveClassCard title="Department Live" scope="department" />

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

        {/* 5b. Dept class reviews (the new class-review pipeline roll-up) */}
        <DeptClassReviewsCard />

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

      </div>
    </>
  );
}
