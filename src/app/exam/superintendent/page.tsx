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
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ApprovalInbox } from "@/components/shared/ApprovalInbox";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
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

/* minimal shape for the permissions logs payload */
interface PermLog {
  person?: { name?: string };
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

function ExamSuperintendentInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  const {
    data: queue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=exam&status=PENDING", { ttlMs: 30_000 });
  const alerts = useApiResource<DataResponse>("/api/alerts?resolved=false", { ttlMs: 30_000 });
  const openAlertCount: number = Array.isArray((alerts.data as DataResponse | null)?.data)
    ? ((alerts.data as DataResponse | null)?.data as unknown[]).length
    : 0;
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshQueue(),
      alerts.refresh()
    ]);
  }, [refreshQueue, alerts.refresh]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = queueLoading && !queue;

  const queueTotal: number = (queue as DataResponse | null)?.total ?? 0;
  const summary: PermLog[] | null =
    ((queue as DataResponse | null)?.data as { logs?: PermLog[] } | null | undefined)?.logs ?? null;
  const scopeName = summary?.[0]?.person?.name ?? "Superintendent";

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
      <WidgetBoundary title="Exam Superintendent Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={Inbox} label="Pending Exam Passes" value={queueTotal} sub="Awaiting clearance at superintendent desk" accent="text-emerald-400" loading={queueLoading && !queue} />
          <StatCard icon={AlertTriangle} label="Open Alerts" value={openAlertCount} sub="Unresolved exam & system alerts" accent="text-amber-400" loading={alerts.loading && !alerts.data} />
          <StatCard icon={UserCheck} label="Scope" value={scopeName} sub="Examination clearance and escalation authority" accent="text-sky-400" loading={false} />
          <StatCard icon={ShieldCheck} label="Stage" value="Superintendent" sub="Examination clearance desk" accent="text-white" loading={false} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/exam/superintendent/schedule" title="Schedule" sub="Exam schedule and key dates" />
          <SectionLink href="/exam/superintendent/access" title="Access" sub="Examination venue access control" />
          <SectionLink href="/exam/superintendent/incidents" title="Incidents" sub="Exam-related incidents and flags" />
          <SectionLink href="/exam/superintendent/reports" title="Reports" sub="Examination reports and analytics" />
        </div>
      </WidgetBoundary>

      {/* Campus home & retention panels */}
      <PersonalizedCampusHome />
      <ApprovalInbox />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <TaskContinuity />
        <RoleAnalytics />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <QuickActions />
        <NotificationCenter />
      </div>
      <DigitalHandover />

      <DevContactStrip />
    </div>
  );
}

export default function ExamSuperintendentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamSuperintendentInner />
    </Suspense>
  );
}
