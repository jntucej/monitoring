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
  Inbox,
  Loader2,
  UserCheck,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface StaffMyDayData {
  data?: {
    dutyRoster?: unknown[];
    myRecent?: unknown[];
    openRequests?: unknown[];
  };
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

function StaffInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;
  const tier = getRoleTier(role);

  const {
    data: myDay,
    loading: myDayLoading,
    refresh: refreshMyDay,
  } = useApiResource<DataResponse>("/api/staff/my-day", { ttlMs: 30_000 });
  const {
    data: leaves,
    loading: leavesLoading,
    refresh: refreshLeaves,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=staff_leave&status=PENDING", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshMyDay(),
      refreshLeaves()
    ]);
  }, [refreshMyDay, refreshLeaves]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = myDayLoading && !myDay || leavesLoading && !leaves;
  const myDayData = (myDay as StaffMyDayData | null)?.data;
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
      <WidgetBoundary title="Staff My Day">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="On Duty Now" value={Array.isArray(myDayData?.dutyRoster) ? myDayData.dutyRoster!.length : '…'} sub="Staff checked in today" accent="text-emerald-400" loading={myDayLoading && !myDay} />
          <StatCard icon={Inbox} label="My Recent Logs" value={Array.isArray(myDayData?.myRecent) ? myDayData.myRecent!.length : 0} sub="Your recent gate movements" accent="text-sky-400" loading={myDayLoading && !myDay} />
          <StatCard icon={AlertTriangle} label="Pending Leaves" value={leavesTotal} sub="Staff-leave requests awaiting review" accent="text-amber-400" loading={leavesLoading && !leaves} />
          <StatCard icon={FileText} label="Open Requests" value={Array.isArray(myDayData?.openRequests) ? myDayData.openRequests!.length : 0} sub="Your open leave requests" accent="text-white" loading={myDayLoading && !myDay} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/staff/my-day" title="My Day" sub="Today's duties and gate activity" />
          <SectionLink href="/staff/duties" title="Duties & Attendance" sub="Duty roster and shift records" />
          <SectionLink href="/staff/requests" title="Pass Requests" sub="Leave requests and approvals" />
          <SectionLink href="/staff/assigned-tasks" title="Assigned Tasks" sub="Open duties and requests assigned to you" />
          <SectionLink href="/staff/notifications" title="Notifications" sub="Campus announcements for your role" />
          <SectionLink href="/staff/request-status" title="Request Status" sub="Live status of your open requests" />
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

export default function StaffPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StaffInner />
    </Suspense>
  );
}
