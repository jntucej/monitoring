"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Loader2,
  Inbox,
  UserCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ApprovalInbox } from "@/components/shared/ApprovalInbox";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function SectionLink({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0 hover:bg-slate-800/50 transition-colors"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </Link>
  );
}

/* main content */

function HodInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);

  const {
    data: faculty,
    loading: facultyLoading,
    error: facultyError,
    refresh: refreshFaculty,
  } = useApiResource<DataResponse>("/api/hod/faculty", { ttlMs: 30_000 });
  const {
    data: students,
    loading: studentsLoading,
    error: studentsError,
    refresh: refreshStudents,
  } = useApiResource<DataResponse>("/api/students/stats", { ttlMs: 30_000 });
  const {
    data: pending,
    loading: pendingLoading,
    error: pendingError,
    refresh: refreshPending,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=exam&status=PENDING&stage=hod", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshFaculty(),
      refreshStudents(),
      refreshPending()
    ]);
  }, [refreshFaculty, refreshStudents, refreshPending]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = facultyLoading && !faculty || studentsLoading && !students || pendingLoading && !pending;
  const pendingTotal: number = (pending as { total?: number })?.total ?? 0;
  const studentsTotal: number | string = (students as { data?: { total?: number } })?.data?.total ?? '…';
  const facultyCount: number | string = Array.isArray((faculty as { data?: unknown[] })?.data) ? (faculty as { data?: unknown[] }).data!.length : '…';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <WidgetBoundary title="HOD Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={Inbox} label="Branch Pending" value={pendingTotal} sub="Requests awaiting HOD-stage action" accent="text-amber-400" loading={pendingLoading && !pending} />
          <StatCard icon={UserCheck} label="Branch Students" value={studentsTotal} sub="Students on campus today" accent="text-emerald-400" loading={studentsLoading && !students} />
          <StatCard icon={Building2} label="Department Faculty" value={facultyCount} sub="Faculty members on your branch" accent="text-sky-400" loading={facultyLoading && !faculty} />
          <StatCard icon={CheckCircle2} label="Approvals Today" value={pendingTotal} sub="Requests raised today in your queue" accent="text-white" loading={pendingLoading && !pending} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/hod/student-directory" title="Student Directory" sub="Department student population and status" />
          <SectionLink href="/hod/department-attendance" title="Department Attendance" sub="Live faculty and staff attendance" />
          <SectionLink href="/hod/attendance-exceptions" title="Attendance Exceptions" sub="Flagged absences and anomalies" />
          <SectionLink href="/hod/faculty-overview" title="Faculty Overview" sub="Department faculty roster" />
          <SectionLink href="/hod/department-pass-requests" title="Pass Requests" sub="Exit and leave passes at HOD stage" />
          <SectionLink href="/hod/pending-approvals" title="Pending Approvals" sub="Exam and memo requests at HOD stage" />
          <SectionLink href="/hod/department-reports" title="Department Reports" sub="Performance and attendance reports" />
          <SectionLink href="/hod/escalation-centre" title="Escalation Centre" sub="Requests escalated to vice principal" />
        </div>
      </WidgetBoundary>

      {/* Quick panel */}
      <WidgetBoundary title="Quick Panel">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <QuickActions />
          <NotificationCenter />
        </div>
      </WidgetBoundary>

      <AttentionQueue />
      <ActivityTimeline />

      {/* Campus services */}
      <WidgetBoundary title="Campus Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <PersonalizedCampusHome />
          <TaskContinuity />
          <ContributionPortfolio />
          <CampusFeedbackDesk />
        </div>
      </WidgetBoundary>

      {/* Approvals & analytics */}
      <WidgetBoundary title="Approvals & Analytics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <ApprovalInbox />
          <RoleAnalytics />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function HodPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HodInner />
    </Suspense>
  );
}
