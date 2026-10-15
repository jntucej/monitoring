"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import {
  Loader2,
  AlertTriangle,
  UserCheck,
  Inbox,
  DoorOpen,
  Gavel,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* response shapes (mirror shared endpoints) */

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

/* building blocks */

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

function DeputyWardenDailyOverviewInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
  const {
    data: outpassQueue,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=hostel&status=PENDING&stage=deputy_warden",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshPresence(), refreshOutpass()]);
  }, [refreshPresence, refreshOutpass]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = (presenceLoading && !presence) || (outpassLoading && !outpassQueue);

  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = useMemo(
    () =>
      gates.reduce(
        (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
        0
      ),
    [gates, matrix]
  );

  const pendingRows = outpassQueue?.data ?? [];
  const pendingTotal = outpassQueue?.total ?? pendingRows.length;
  const slaBreached = pendingRows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const SECTIONS = [
    { href: "/deputy-warden/resident-attendance", title: "Resident Attendance", sub: "Resident attendance by gate" },
    { href: "/deputy-warden/outpass-queue", title: "Outpass Queue", sub: "Outpass and hostel pass requests at warden stage" },
    { href: "/deputy-warden/leave-requests", title: "Leave Requests", sub: "Staff-leave requests awaiting review" },
    { href: "/deputy-warden/gate-movement", title: "Gate Movement", sub: "Live gate presence and movement" },
    { href: "/deputy-warden/incident-reporting", title: "Incident Reporting", sub: "Incident recording and escalation" },
    { href: "/deputy-warden/shift-handover", title: "Shift Handover", sub: "Shift handover notes" },
    { href: "/deputy-warden/delegated-approvals", title: "Delegated Approvals", sub: "Delegation-scoped approval queue" },
    { href: "/deputy-warden/decision-history", title: "Decision History", sub: "Past gate activity and approval decisions" },
  ] as const;

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

      {(presenceError || outpassError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Some overview data unavailable: {presenceError || outpassError}
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

      {/* KPI row */}
      <WidgetBoundary title="Daily Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={UserCheck}
            label="On Campus"
            value={onCampusTotal}
            sub="People inside all active gates (live presence matrix)"
            accent="text-emerald-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Inbox}
            label="Pending at Warden Stage"
            value={pendingTotal}
            sub="Hostel / outpass requests awaiting principal review"
            accent="text-amber-400"
            loading={outpassLoading && !outpassQueue}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={slaBreached}
            sub="Warden-stage requests past their 48h deadline"
            accent="text-rose-400"
            loading={outpassLoading && !outpassQueue}
          />
          <StatCard
            icon={DoorOpen}
            label="Reporting Gates"
            value={gates.length}
            sub="Gates currently feeding the presence matrix"
            accent="text-white"
            loading={presenceLoading && !presence}
          />
        </div>
      </WidgetBoundary>

      {/* Authority note */}
      <WidgetBoundary title="Authority Scope">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <Gavel className="w-5 h-5 text-sky-400 shrink-0" />
            <p className="text-sm text-slate-300 min-w-0">
              Deputy-warden approvals are effective only <span className="font-semibold text-sky-300">within an explicit delegation or standing policy scope</span> issued by the
              principal/warden. Without recorded delegation data, review actions surface as
              read-only here and are escalated to the warden stage.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          {SECTIONS.map((s) => (
            <SectionLink key={s.href} href={s.href} title={s.title} sub={s.sub} />
          ))}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function DeputyWardenDailyOverviewPage() {
  return (
    <AuthGuard allowedRoles={['deputy_warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenDailyOverviewInner />
      </Suspense>
    </AuthGuard>
  );
}
