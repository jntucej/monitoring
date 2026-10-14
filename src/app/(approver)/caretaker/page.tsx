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
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Building2,
  FileText,
  CheckCircle2,
  Wrench,
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

function CaretakerInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "caretaker") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<DataResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
  const {
    data: pending,
    loading: pendingLoading,
    error: pendingError,
    refresh: refreshPending,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=staff_leave&status=PENDING&stage=caretaker", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshPresence(),
      refreshPending()
    ]);
  }, [refreshPresence, refreshPending]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = presenceLoading && !presence || pendingLoading && !pending;
  const pendingTotal: number = (pending as { total?: number } | null)?.total ?? 0;
  const managed: string = pendingLoading && !pending ? '…' : `${pendingTotal} in pipeline`;

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
      <WidgetBoundary title="Caretaker Facilities Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={Building2} label="On Campus Now" value={'live presence matrix'} sub="People inside all active gates" accent="text-emerald-400" loading={presenceLoading && !presence} />
          <StatCard icon={Inbox} label="Pending Requests" value={pendingTotal} sub="Requests at the caretaker stage" accent="text-amber-400" loading={pendingLoading && !pending} />
          <StatCard icon={Wrench} label="Facilities" value={managed} sub="Facilities under caretaker oversight" accent="text-sky-400" loading={presenceLoading && !presence} />
          <StatCard icon={FileText} label="Work Orders" value={pendingTotal} sub="Maintenance work orders in progress" accent="text-white" loading={pendingLoading && !pending} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/caretaker/facilities" title="Facilities" sub="Campus facility status and access" />
          <SectionLink href="/caretaker/assets" title="Assets" sub="Asset inventory and location" />
          <SectionLink href="/caretaker/maintenance" title="Maintenance" sub="Maintenance schedule and tasks" />
          <SectionLink href="/caretaker/work-orders" title="Work Orders" sub="Open and completed work orders" />
          <SectionLink href="/caretaker/faults" title="Faults" sub="Reported faults and repairs" />
          <SectionLink href="/caretaker/history" title="History" sub="Past maintenance and gate activity" />
          <SectionLink href="/caretaker/workers" title="Workers" sub="Worker shifts and presence" />
          <SectionLink href="/caretaker/reports" title="Reports" sub="Facility and maintenance reports" />
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

export default function CaretakerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CaretakerInner />
    </Suspense>
  );
}
