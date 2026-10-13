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
  Clock,
  Loader2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Building2,
  FileText,
  CheckCircle2,
  Wrench,
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
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshMyShift()
    ]);
  }, [refreshMyShift]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = myShiftLoading && !myShift;
  const summary = ((myShift as { data?: ShiftSummary } | null)?.data) as ShiftSummary | undefined;
  const recentLogCount = summary?.myRecent?.length ?? 0;
  const openOrderCount = summary?.openWorkOrders?.length ?? 0;

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

      {/* KPI row */}
      <WidgetBoundary title="Worker My Work">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="My Shift Status" value={'live'} sub="Current shift and gate status" accent="text-emerald-400" loading={myShiftLoading && !myShift} />
          <StatCard icon={Inbox} label="My Recent Logs" value={recentLogCount} sub="Recent gate movements" accent="text-sky-400" loading={myShiftLoading && !myShift} />
          <StatCard icon={AlertTriangle} label="Open Work Orders" value={openOrderCount} sub="Pending work assignments" accent="text-amber-400" loading={myShiftLoading && !myShift} />
          <StatCard icon={Clock} label="Hours Today" value={'live'} sub="Hours logged this shift" accent="text-white" loading={myShiftLoading && !myShift} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/worker/my-work" title="My Work" sub="Today's tasks and assignments" />
          <SectionLink href="/worker/shift" title="Shift" sub="Shift schedule and status" />
          <SectionLink href="/worker/attendance" title="Attendance" sub="Attendance records and punch times" />
          <SectionLink href="/worker/work-orders" title="Work Orders" sub="Open and completed work orders" />
          <SectionLink href="/worker/maintenance" title="Maintenance" sub="Assigned maintenance tasks" />
          <SectionLink href="/worker/task-completion" title="Task Completion" sub="Task completion status" />
          <SectionLink href="/worker/notifications" title="Notifications" sub="Work-related notifications" />
          <SectionLink href="/worker/history" title="History" sub="Past shifts and work logs" />
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
