"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {

  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  FileText,
  Building2,
  BedDouble,
  Activity,
  Wrench,
  Sparkles,
  Lock,
  Info,
} from "lucide-react";

/**
 * Hostel Manager dedicated dashboard — accommodation & operational-resource
 * focused, NOT a broad institutional dashboard.
 *
 * Data sources (verified 200 for the hostel_manager tier):
 *   • /api/occupancy/presence-matrix — live on-campus presence by gate
 *   • /api/departments — active department count (KPI context)
 *   • /api/permissions?workflow_type=staff_leave&status=PENDING
 *   • /api/permissions?workflow_type=outpass&status=PENDING — resident
 *     service-request queues (outpasses + staff leaves)
 *
 * Endpoints that are 403 (e.g. /api/occupancy/current, /api/occupancy/history,
 * /api/analytics/occupancy, /api/staff/attendance, /api/alerts) or 404
 * (/api/hostels, /api/residents, /api/maintenance) are NEVER fetched. Panels
 * that need that data render clean "restricted at this tier" empty-states
 * instead of error banners.
 */

/* ── response shapes (mirror /api/permissions) ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

/* ── response shapes (mirror /api/departments) ── */

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  totalStudents?: number;
  facultyCount?: number;
}

interface DepartmentsResponse {
  success: boolean;
  data: DepartmentRow[];
}

/* ── response shapes (mirror /api/occupancy/presence-matrix) ── */

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

/* ── building blocks ── */

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
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function EmptyState({ message, restricted }: { message: string; restricted?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-8 text-center text-sm min-w-0 ${
        restricted
          ? "border-dashed border-slate-700 bg-slate-800/30 text-slate-500"
          : "border border-slate-800 bg-[#111827] text-slate-400"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {restricted ? <Lock className="w-5 h-5 text-slate-600" /> : <Inbox className="w-5 h-5 text-slate-600" />}
        <p className="max-w-md">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

/** Combined ticket table for the resident service-request panel. */
function ServiceRequestTable({
  rows,
  linkLabel,
}: {
  rows: PermissionRequestRow[];
  linkLabel?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No pending resident service requests. The hostel service queue is clear." />;
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Student</th>
            <th className="text-left px-4 py-3">Workflow</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 15).map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <a
                  href={`/permissions/${r.ticket_number}`}
                  className="text-white font-mono text-xs whitespace-nowrap hover:text-emerald-400"
                >
                  {r.ticket_number}
                </a>
              </td>
              <td className="px-4 py-3 text-slate-300 min-w-0">
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">
                {r.workflow_type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                {r.sla_deadline ? (
                  new Date(r.sla_deadline).getTime() < Date.now() ? (
                    <span className="text-rose-400">
                      Breached · {new Date(r.sla_deadline).toLocaleString()}
                    </span>
                  ) : (
                    new Date(r.sla_deadline).toLocaleString()
                  )
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {linkLabel && (
        <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <p className="text-xs text-slate-500 min-w-0">
            {rows.length} pending hostel service requests — actionable at the hostel approvals desk.
          </p>
          <a
            href="/hostel/permissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
          >
            {linkLabel} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

/* ── main content ── */

function HostelManagerDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hostel_manager") as Role;
  const tier = getRoleTier(role);

  /* 200-safe sources only */
  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const {
    data: departments,
    loading: departmentsLoading,
    error: departmentsError,
    refresh: refreshDepartments,
  } = useApiResource<DepartmentsResponse>("/api/departments", { ttlMs: 60_000 });

  const {
    data: leaveQueue,
    loading: leaveLoading,
    error: leaveError,
    refresh: refreshLeave,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=staff_leave&status=PENDING",
    { ttlMs: 30_000 }
  );

  const {
    data: outpassQueue,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=outpass&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshPresence(), refreshDepartments(), refreshLeave(), refreshOutpass()]);
  }, [refreshPresence, refreshDepartments, refreshLeave, refreshOutpass]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  /* KPIs */
  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );
  const perGateCounts = gates.map((g) => ({
    ...g,
    count: Object.values(matrix[g.id] ?? {}).reduce((a: number, b: number) => a + b, 0),
  }));

  const deptCount = departments?.data?.length ?? 0;

  const leaveRows = leaveQueue?.data ?? [];
  const outpassRows = outpassQueue?.data ?? [];
  const pendingLeave = leaveQueue?.total ?? leaveRows.length;
  const pendingOutpass = outpassQueue?.total ?? outpassRows.length;

  const serviceRows = [...outpassRows, ...leaveRows];
  const busy =
    (presenceLoading || departmentsLoading || leaveLoading || outpassLoading) &&
    !presence &&
    !departments &&
    !leaveQueue &&
    !outpassQueue;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={presenceLoading || departmentsLoading || leaveLoading || outpassLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {presenceLoading || departmentsLoading || leaveLoading || outpassLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {presenceLoading || departmentsLoading || leaveLoading || outpassLoading
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </div>

      {/* global error banner — only for real (non-restricted) failures */}
      {(presenceError || departmentsError || leaveError || outpassError) && (
        <ErrorBanner
          message={`One or more hostel panels failed to load: ${[presenceError, departmentsError, leaveError, outpassError]
            .filter(Boolean)
            .join(" · ")}`}
          onRetry={() => void refreshAll()}
        />
      )}

      {/* 1 · Hostel Operations Overview — KPI row */}
      <WidgetBoundary title="Hostel Operations Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={UserCheck}
            label="On Campus Total"
            value={onCampusTotal}
            sub="People inside all active gates (live presence matrix)"
            accent="text-sky-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Inbox}
            label="Pending Outpass"
            value={pendingOutpass}
            sub="Outpass requests awaiting hostel review"
            accent="text-emerald-400"
            loading={outpassLoading && !outpassQueue}
          />
          <StatCard
            icon={FileText}
            label="Pending Staff Leave"
            value={pendingLeave}
            sub="Staff-leave requests awaiting hostel review"
            accent="text-amber-400"
            loading={leaveLoading && !leaveQueue}
          />
          <StatCard
            icon={Building2}
            label="Active Departments"
            value={deptCount}
            sub="Departments on the institutional roster"
            accent="text-white"
            loading={departmentsLoading && !departments}
          />
        </div>
      </WidgetBoundary>

      {/* 2 · Room and Bed Allocation */}
      <WidgetBoundary title="Room and Bed Allocation">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <BedDouble className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Allocation Status</span>
          </div>
          <EmptyState
            restricted
            message="Room & bed allocation is managed outside this dashboard and is not exposed at this tier. No dedicated room/bed data source is available to the Hostel Manager view."
          />
        </div>
      </WidgetBoundary>

      {/* 3 · Occupancy Reports */}
      <WidgetBoundary title="Occupancy Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Live Occupancy by Gate
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {presence?.data?.lastUpdated ? `updated ${new Date(presence.data.lastUpdated).toLocaleString()}` : "live presence matrix"}
            </span>
          </div>
          {presenceLoading && !presence ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading occupancy reports…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 min-w-0">
              {perGateCounts.map((g) => (
                <div key={g.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide truncate">
                    {g.code} · {g.name}
                  </p>
                  <p className="text-xl font-bold text-sky-400 mt-1">{g.count}</p>
                  <p className="text-xs text-slate-500">on-campus now</p>
                </div>
              ))}
              {perGateCounts.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <EmptyState message="No active gates in the presence matrix right now." />
                </div>
              )}
            </div>
          )}
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            Detailed occupancy snapshots (current, historical, analytic breakdowns) are
            restricted at this tier; this report is derived from the live presence matrix
            only.
          </div>
        </div>
      </WidgetBoundary>

      {/* 4 · Maintenance Requests */}
      <WidgetBoundary title="Maintenance Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Wrench className="w-4 h-4 text-amber-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Facility & Maintenance Queue</span>
          </div>
          <EmptyState
            restricted
            message="Maintenance requests are not exposed at this tier. Facility work is tracked by the admin desk; maintenance-related approvals for the hostel are routed through the hostel approvals desk."
          />
          <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <p className="text-xs text-slate-500 min-w-0">Maintenance items needing sign-off appear in the hostel approvals desk.</p>
            <a
              href="/hostel/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
            >
              Hostel Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>

      {/* 5 · Housekeeping Tasks */}
      <WidgetBoundary title="Housekeeping Tasks">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-sky-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Housekeeping & Duty Roster</span>
          </div>
          <EmptyState
            restricted
            message="Housekeeping tasks are not exposed at this tier. Duty rosters and housekeeping schedules are managed by the caretaker desk."
          />
        </div>
      </WidgetBoundary>

      {/* 6 · Resident Service Requests */}
      <WidgetBoundary title="Resident Service Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Outpass & Staff-Leave Queue
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{serviceRows.length} pending</span>
          </div>
          {leaveLoading || outpassLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading resident service requests…
            </div>
          ) : (
            <ServiceRequestTable rows={serviceRows} linkLabel="Hostel Approvals Desk" />
          )}
        </div>
      </WidgetBoundary>

      {/* 7 · Hostel Resource Reports */}
      <WidgetBoundary title="Hostel Resource Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Resource & Inventory Reports</span>
          </div>
          <EmptyState
            restricted
            message="Hostel resource reports are not exposed at this tier. Inventory and resource analytics remain admin-scoped."
          />
        </div>
      </WidgetBoundary>

      {/* 8 · Authority note */}
      <WidgetBoundary title="Authority Scope">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="min-w-0 flex items-start gap-3">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm text-slate-300">
                  The Hostel Manager role manages accommodation and operational resources.
                  There is no automatic access to disciplinary records or unrelated
                  institutional data.
                </p>
                <p className="mt-2 text-xs text-slate-500 min-w-0">
                  All hostel approval actions (approve, forward, reject) run from the hostel
                  approvals desk.
                </p>
              </div>
            </div>
            <a
              href="/hostel/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
            >
              Hostel Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function HostelManagerDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelManagerDashboardInner />
    </Suspense>
  );
}
