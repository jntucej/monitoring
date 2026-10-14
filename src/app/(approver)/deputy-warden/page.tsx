"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import {
  ShieldCheck,
  Loader2,
  UserCheck,
  Inbox,
  AlertTriangle,
  Building2,
  FileText,
  CheckCircle2,
  Wrench,
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

function DeputyWardenInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<DataResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
  const {
    data: outpass,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<DataResponse>(
    "/api/permissions?workflowType=hostel&status=PENDING&stage=deputy_warden",
    { ttlMs: 30_000 }
  );
  const {
    data: leaves,
    loading: leavesLoading,
    error: leavesError,
    refresh: refreshLeaves,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=staff_leave&status=PENDING", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshPresence(),
      refreshOutpass(),
      refreshLeaves()
    ]);
  }, [refreshPresence, refreshOutpass, refreshLeaves]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = presenceLoading && !presence || outpassLoading && !outpass || leavesLoading && !leaves;
  const outpassTotal: number = (outpass as { total?: number } | null)?.total ?? 0;
  const leavesTotal: number = (leaves as { total?: number } | null)?.total ?? 0;

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

      {/* Authority scope note */}
      <WidgetBoundary title="Authority Scope">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            <p className="text-sm text-slate-300 min-w-0">
              Deputy-warden approvals are effective only <span className="font-semibold text-sky-300">within an explicit delegation or standing policy scope</span> issued by the
              principal/warden. Without recorded delegation data, review actions surface as
              read-only here and are escalated to the warden stage.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* KPI row */}
      <WidgetBoundary title="Deputy Warden Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="On Campus Total" value={'live presence matrix'} sub="People inside all active gates" accent="text-emerald-400" loading={presenceLoading && !presence} />
          <StatCard icon={Inbox} label="Pending at Warden Stage" value={outpassTotal} sub="Hostel / outpass items awaiting warden review" accent="text-amber-400" loading={outpassLoading && !outpass} />
          <StatCard icon={AlertTriangle} label="Pending Leaves" value={leavesTotal} sub="Staff-leave items awaiting review" accent="text-sky-400" loading={leavesLoading && !leaves} />
          <StatCard icon={ShieldCheck} label="Active Gates" value="live presence matrix" sub="Gates reporting to presence matrix" accent="text-white" loading={presenceLoading && !presence} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          <SectionLink href="/deputy-warden/daily-overview" title="Daily Overview" sub="KPI row and authority scope" />
          <SectionLink href="/deputy-warden/resident-attendance" title="Resident Attendance" sub="Resident attendance by gate" />
          <SectionLink href="/deputy-warden/outpass-queue" title="Outpass Queue" sub="Outpass and hostel pass requests at warden stage" />
          <SectionLink href="/deputy-warden/leave-requests" title="Leave Requests" sub="Staff-leave requests awaiting review" />
          <SectionLink href="/deputy-warden/gate-movement" title="Gate Movement" sub="Live gate presence and movement" />
          <SectionLink href="/deputy-warden/incident-reporting" title="Incident Reporting" sub="Incident recording and escalation" />
          <SectionLink href="/deputy-warden/shift-handover" title="Shift Handover" sub="Shift handover notes" />
          <SectionLink href="/deputy-warden/delegated-approvals" title="Delegated Approvals" sub="Delegation-scoped approval queue" />
          <SectionLink href="/deputy-warden/decision-history" title="Decision History" sub="Past gate activity and approval decisions" />
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

export default function DeputyWardenPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DeputyWardenInner />
    </Suspense>
  );
}
