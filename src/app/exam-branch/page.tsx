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

function ExamBranchInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data: oieQueue,
    loading: oieQueueLoading,
    error: oieQueueError,
    refresh: refreshOieQueue,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=exam&status=PENDING&stage=oie", { ttlMs: 30_000 });
  const {
    data: vpQueue,
    loading: vpQueueLoading,
    error: vpQueueError,
    refresh: refreshVpQueue,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=exam&status=PENDING&stage=vice_principal", { ttlMs: 30_000 });
  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<DataResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshOieQueue(),
      refreshVpQueue(),
      refreshPresence()
    ]);
  }, [refreshOieQueue, refreshVpQueue, refreshPresence]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = oieQueueLoading && !oieQueue || vpQueueLoading && !vpQueue || presenceLoading && !presence;
  const oieTotal: number = (oieQueue as { total?: number } | null)?.total ?? 0;
  const vpTotal: number = (vpQueue as { total?: number } | null)?.total ?? 0;

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
      <WidgetBoundary title="Exam Branch Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={Inbox} label="OIE-Stage Pending" value={oieTotal} sub="Exam clearances awaiting OIE review" accent="text-emerald-400" loading={oieQueueLoading && !oieQueue} />
          <StatCard icon={UserCheck} label="VP-Stage Escalations" value={vpTotal} sub="Exam requests escalated to vice principal" accent="text-sky-400" loading={vpQueueLoading && !vpQueue} />
          <StatCard icon={AlertTriangle} label="Total Open" value={oieTotal} sub="All pending exam-stage approvals" accent="text-amber-400" loading={oieQueueLoading && !oieQueue} />
          <StatCard icon={ShieldCheck} label="On Campus Now" value={'live presence matrix'} sub="All roles inside active gates" accent="text-white" loading={presenceLoading && !presence} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/exam-branch/calendar" title="Calendar" sub="Exam schedule and key dates" />
          <SectionLink href="/exam-branch/records" title="Records" sub="Candidate records and attendance" />
          <SectionLink href="/exam-branch/pass-queue" title="Pass Queue" sub="Exam passes awaiting clearance" />
          <SectionLink href="/exam-branch/verification" title="Verification" sub="Verification of exam clearances" />
          <SectionLink href="/exam-branch/discrepancies" title="Discrepancies" sub="Flagged discrepancies for review" />
          <SectionLink href="/exam-branch/reports" title="Reports" sub="Exam branch analytics and reports" />
          <SectionLink href="/exam-branch/oie-handoff" title="OIE Handoff" sub="Handoff items to OIE stage" />
          <SectionLink href="/exam-branch/docs" title="Docs" sub="Exam branch documentation" />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchInner />
    </Suspense>
  );
}
