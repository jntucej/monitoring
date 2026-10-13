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
  UserCheck,
  Clock,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface ShiftSummary {
  shiftStatus?: string;
  myRecent?: unknown[];
  openWorkOrders?: unknown[];
  todayShifts?: Array<{
    id?: string;
    name?: string;
    worker_id?: string;
    check_in?: string | null;
    check_out?: string | null;
    scans?: number;
  }>;
}

interface MyWorkResponse {
  success: boolean;
  data: {
    tasks: unknown[];
    completedLastWeek: number;
    todayShift: {
      checkIn: string | null;
      checkOut: string | null;
      scans: number;
    } | null;
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

function WorkerInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const {
    data: myShift,
    loading: myShiftLoading,
    error: myShiftError,
    refresh: refreshMyShift,
  } = useApiResource<DataResponse>("/api/workers/my-shift", { ttlMs: 30_000 });

  const {
    data: myWork,
    loading: myWorkLoading,
    error: myWorkError,
    refresh: refreshMyWork,
  } = useApiResource<MyWorkResponse>("/api/workers/my-work", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshMyShift(), refreshMyWork()]);
  }, [refreshMyShift, refreshMyWork]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = (myShiftLoading && !myShift) || (myWorkLoading && !myWork);
  const summary = ((myShift as { data?: ShiftSummary } | null)?.data) as ShiftSummary | undefined;
  const openOrderCount = summary?.openWorkOrders?.length ?? 0;

  const todayShiftRow = summary?.todayShifts?.[0];
  const onShift = Boolean(todayShiftRow?.check_in && !todayShiftRow.check_out);
  const shiftLabel = todayShiftRow?.check_in
    ? onShift
      ? "On shift"
      : "Shift complete"
    : "No check-in today";
  const attendanceLabel = todayShiftRow?.check_in ? "Checked in" : "Not checked in";
  const assignedWorkCount = myWork?.data?.tasks?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* KPI row — spec: assigned work count, current shift, attendance status, open work orders */}
      <WidgetBoundary title="Worker Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="Assigned Work"
            value={assignedWorkCount}
            sub="Open tasks in your queue"
            accent="text-sky-400"
            loading={myWorkLoading && !myWork}
          />
          <StatCard
            icon={Clock}
            label="Current Shift"
            value={shiftLabel}
            sub={
              todayShiftRow?.check_in
                ? `Check-in ${new Date(todayShiftRow.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Gate check-in pending"
            }
            accent={onShift ? "text-emerald-400" : "text-white"}
            loading={myShiftLoading && !myShift}
          />
          <StatCard
            icon={UserCheck}
            label="Attendance Status"
            value={attendanceLabel}
            sub={`${todayShiftRow?.scans ?? 0} gate scan(s) today`}
            accent={attendanceLabel === "Checked in" ? "text-emerald-400" : "text-amber-400"}
            loading={myShiftLoading && !myShift}
          />
          <StatCard
            icon={AlertTriangle}
            label="Open Work Orders"
            value={openOrderCount}
            sub="Pending work assignments"
            accent="text-amber-400"
            loading={myShiftLoading && !myShift}
          />
        </div>
      </WidgetBoundary>

      {/* Error banner */}
      {(myShiftError || myWorkError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Overview data unavailable: {myShiftError || myWorkError}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/worker/my-work" title="My Assigned Work" sub="Today's tasks and assignments" />
          <SectionLink href="/worker/shift" title="Shift Information" sub="Shift schedule and status" />
          <SectionLink href="/worker/attendance" title="Attendance" sub="Attendance records and punch times" />
          <SectionLink href="/worker/work-orders" title="Work Order Updates" sub="Open and completed work orders" />
          <SectionLink href="/worker/maintenance" title="Maintenance Tasks" sub="Assigned maintenance tasks" />
          <SectionLink href="/worker/task-completion" title="Task Completion" sub="Task completion status" />
          <SectionLink href="/worker/notifications" title="Notifications" sub="Work-related notifications" />
          <SectionLink href="/worker/history" title="Personal History" sub="Past shifts and work logs" />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerInner />
    </Suspense>
  );
}
