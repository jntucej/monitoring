"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import {
  Loader2,
  UserCheck,
  Inbox,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface FacultyAttendanceSummary {
  totalFaculty?: number;
  presentToday?: number;
  overallAttendanceRate?: number;
}

type FacultyAttendanceData = { summary?: FacultyAttendanceSummary };

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

function FacultyInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "faculty") as Role;
  const tier = getRoleTier(role);

  const {
    data: attendance,
    loading: attendanceLoading,
    refresh: refreshAttendance,
  } = useApiResource<DataResponse>("/api/faculty/attendance", { ttlMs: 30_000 });
  const {
    data: leaves,
    loading: leavesLoading,
    refresh: refreshLeaves,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=staff_leave&status=PENDING&stage=faculty", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshAttendance(),
      refreshLeaves()
    ]);
  }, [refreshAttendance, refreshLeaves]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = attendanceLoading && !attendance || leavesLoading && !leaves;
  const attendanceSummary = (attendance as FacultyAttendanceData | null)?.summary;
  const leavesTotal = (leaves as { total?: number } | null)?.total ?? 0;

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
      <WidgetBoundary title="Faculty Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="Faculty On Roster" value={attendanceSummary?.totalFaculty ?? '…'} sub="Faculty members in your department" accent="text-emerald-400" loading={attendanceLoading && !attendance} />
          <StatCard icon={Inbox} label="Present Today" value={attendanceSummary?.presentToday ?? '…'} sub="Checked in today" accent="text-sky-400" loading={attendanceLoading && !attendance} />
          <StatCard icon={AlertTriangle} label="Pending Requests" value={leavesTotal} sub="Staff-leave requests at your stage" accent="text-amber-400" loading={leavesLoading && !leaves} />
          <StatCard icon={FileText} label="Attendance Rate" value={attendanceSummary?.overallAttendanceRate !== undefined ? `${attendanceSummary.overallAttendanceRate}%` : '…'} sub="Department-wide rate" accent="text-white" loading={attendanceLoading && !attendance} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/faculty/my-classes" title="My Classes" sub="Class schedule and attendance records" />
          <SectionLink href="/faculty/student-directory" title="Student Directory" sub="Students under your supervision" />
          <SectionLink href="/faculty/attendance-management" title="Attendance Management" sub="Record and review faculty attendance" />
          <SectionLink href="/faculty/correction-requests" title="Correction Requests" sub="Memos you can recommend on — HOD approves" />
          <SectionLink href="/faculty/student-requests" title="Student Requests" sub="Requests awaiting your recommendation" />
          <SectionLink href="/faculty/class-attendance-reports" title="Class Reports" sub="Per-class attendance summaries" />
          <SectionLink href="/faculty/notifications" title="Notifications" sub="Campus announcements for your role" />
          <SectionLink href="/faculty/request-history" title="Request History" sub="All requests you raised, any status" />
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

      {/* Shift handover */}
      <WidgetBoundary title="Shift Handover">
        <div className="grid grid-cols-1 min-w-0">
          <DigitalHandover />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function FacultyPage() {
  return (
    <AuthGuard allowedRoles={['faculty', 'hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <FacultyInner />
      </Suspense>
    </AuthGuard>
  );
}
