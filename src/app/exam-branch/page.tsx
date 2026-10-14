"use client";

import { Suspense, useCallback, useMemo } from "react";
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
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import {
  Inbox,
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

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
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
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
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
  const onCampusTotal: number = useMemo(() => {
    const gates = presence?.data?.gates ?? [];
    const m = presence?.data?.matrix ?? {};
    const rolesList = presence?.data?.roles ?? [];
    const gateTotals = gates.map((g) => ({
      ...g,
      total: rolesList.reduce((sum, r) => sum + (m[g.id]?.[r] ?? 0), 0),
    }));
    return gateTotals.reduce((sum, g) => sum + g.total, 0);
  }, [presence]);

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
      <WidgetBoundary title="Exam Branch Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={Inbox} label="OIE-Stage Pending" value={oieTotal} sub="Exam clearances awaiting OIE review" accent="text-emerald-400" loading={oieQueueLoading && !oieQueue} />
          <StatCard icon={UserCheck} label="VP-Stage Escalations" value={vpTotal} sub="Exam requests escalated to vice principal" accent="text-sky-400" loading={vpQueueLoading && !vpQueue} />
          <StatCard icon={AlertTriangle} label="Total Open" value={oieTotal} sub="All pending exam-stage approvals" accent="text-amber-400" loading={oieQueueLoading && !oieQueue} />
          <StatCard icon={ShieldCheck} label="On Campus Now" value={presence ? onCampusTotal : "…"} sub="All roles inside active gates" accent="text-emerald-400" loading={presenceLoading && !presence} />
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

      {/* Campus home & retention panels */}
      <PersonalizedCampusHome />
      <AttentionQueue />
      <ActivityTimeline />
      <ApprovalInbox />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <TaskContinuity />
        <RoleAnalytics />
      </div>
      <DigitalHandover />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <QuickActions />
        <NotificationCenter />
      </div>

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
