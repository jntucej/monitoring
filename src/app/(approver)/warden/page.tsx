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
  AlertTriangle,
  UserCheck,
  ArrowRight,
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

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

interface WardenScopeRow {
  id: string;
  name: string;
  role: string;
  assigned_hostel: string | null;
  supervised_gates: string[] | null;
}

interface WardenScopeResponse {
  success: boolean;
  data: {
    requestingUser: WardenScopeRow | null;
    wardens: WardenScopeRow[];
    activeDelegations: Array<{
      id: string;
      scope: string;
      status: string;
      delegate_role: string;
      note: string | null;
      expires_at: string;
    }>;
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

function WardenInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  // Outpass / leave requests at the warden stage (warden was folded into
  // principal, so the queue lives at the warden_or_principal stage).
  const {
    data: outpass,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<DataResponse>(
    "/api/permissions?workflowType=hostel&status=PENDING&stage=warden_or_principal",
    { ttlMs: 30_000 }
  );

  // Open incidents via the alerts endpoint.
  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useApiResource<DataResponse>("/api/alerts?resolved=false", { ttlMs: 30_000 });

  // Live occupancy snapshot.
  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  // Warden authority scope (assigned hostel + active delegations).
  const {
    data: scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useApiResource<WardenScopeResponse>("/api/warden/hostel-scope", {
    ttlMs: 60_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshOutpass(),
      refreshAlerts(),
      refreshPresence(),
      refreshScope(),
    ]);
  }, [refreshOutpass, refreshAlerts, refreshPresence, refreshScope]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy =
    (outpassLoading && !outpass) ||
    (alertsLoading && !alerts) ||
    (presenceLoading && !presence) ||
    (scopeLoading && !scope);

  const outpassTotal: number = outpass?.total ?? 0;
  const openAlerts: number = (alerts as { total?: number } | null)?.total ??
    ((alerts as { data?: unknown[] } | null)?.data?.length ?? 0);
  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );
  const activeGates = gates.length;

  const scopeRow = scope?.data?.requestingUser ?? null;
  const assignedHostel = scopeRow?.assigned_hostel ?? null;
  const activeDelegations = scope?.data?.activeDelegations ?? [];
  const scopeSummary = assignedHostel
    ? `Assigned hostel: ${assignedHostel}`
    : "Assigned hostel not set";
  const scopeDelegation =
    activeDelegations.length > 0
      ? ` · ${activeDelegations.length} active delegation(s)`
      : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link to the command center (warden was folded into principal) */}
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Principal Command Center
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Authority: warden approves hostel requests within assigned hostel +
            delegated scope ·{" "}
            <span className="text-slate-300">{scopeSummary}</span>
            {scopeDelegation}
          </p>
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {/* error banners */}
      {(outpassError || alertsError || presenceError || scopeError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {[outpassError, alertsError, presenceError, scopeError]
                .filter(Boolean)
                .map((e) => e as string)
                .join(" · ")}
            </span>
          </span>
        </div>
      )}

      {/* KPI row */}
      <WidgetBoundary title="Warden Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="Pending Outpass & Leave"
            value={outpassTotal}
            sub="Hostel requests at the warden stage"
            accent="text-amber-400"
            loading={outpassLoading && !outpass}
          />
          <StatCard
            icon={AlertTriangle}
            label="Open Incidents"
            value={openAlerts}
            sub="Unresolved alerts visible to this role"
            accent="text-rose-400"
            loading={alertsLoading && !alerts}
          />
          <StatCard
            icon={UserCheck}
            label="On Campus Now"
            value={onCampusTotal}
            sub="People inside active gates (live presence matrix)"
            accent="text-emerald-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={ShieldCheck}
            label="Active Gates"
            value={activeGates}
            sub="Gates reporting to the presence matrix"
            accent="text-white"
            loading={presenceLoading && !presence}
          />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink
            href="/warden/resident-directory"
            title="Resident Directory"
            sub="Students and residents under warden supervision"
          />
          <SectionLink
            href="/warden/hostel-attendance"
            title="Hostel Attendance"
            sub="Live resident attendance by gate"
          />
          <SectionLink
            href="/warden/outpass-leave"
            title="Outpass Requests"
            sub="Outpass requests awaiting the warden"
          />
          <SectionLink
            href="/warden/leave-requests"
            title="Leave Requests"
            sub="Leave requests at the warden stage"
          />
          <SectionLink
            href="/warden/entry-exit"
            title="Entry/Exit Records"
            sub="Movement logs at hostel gates"
          />
          <SectionLink
            href="/warden/incidents"
            title="Hostel Incidents"
            sub="Open hostel incidents and alerts"
          />
          <SectionLink
            href="/warden/room-occupancy"
            title="Room Allocation"
            sub="Current room and gate occupancy"
          />
          <SectionLink
            href="/warden/escalated-requests"
            title="Escalated Requests"
            sub="Tickets escalated past the warden stage"
          />
          <SectionLink
            href="/warden/hostel-reports"
            title="Hostel Reports"
            sub="Hostel analytics and summaries"
          />
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

export default function WardenDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenInner />
    </Suspense>
  );
}
