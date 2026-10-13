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

  Users,
  Building2,
  DoorOpen,
  ScrollText,
  Clock,
  Loader2,
  Inbox,
  UserCheck,
  FileText,
  BellOff,
  CheckSquare,
  ArrowRight,
  Lock,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

/**
 * Deputy Warden dedicated dashboard — delegated hostel operations.
 *
 * Data sources (all verified 200 for the deputy_warden role, tier 65):
 *   • /api/occupancy/presence-matrix — on-campus presence by gate × role
 *   • /api/departments — active department count
 *   • /api/permissions?workflow_type=staff_leave&status=PENDING
 *   • /api/permissions?workflow_type=outpass&status=PENDING
 *
 * Endpoints that are 403 for deputy_warden (/api/occupancy/current,
 * /api/gate/logs, /api/alerts, /api/attendance_records, /api/staff/
 * attendance, /api/faculty/attendance, /api/analytics/*, /api/passes,
 * /api/principal/audit) are NEVER fetched — those panels render clean
 * "restricted at this tier" empty-states instead of raw error banners.
 */

/* ── response shapes (mirror the route handlers) ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string; hostel_block?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

interface DepartmentRow {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
}

interface DepartmentsResponse {
  success: boolean;
  data: DepartmentRow[];
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

function SectionHeader({
  icon: Icon,
  title,
  side,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  side?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </div>
      {side}
    </div>
  );
}

/** Combined staff-leave + outpass queue table. */
function ReviewTable({ rows, onLoading }: { rows: PermissionRequestRow[]; onLoading: boolean }) {
  if (onLoading) {
    return (
      <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading leave & outpass queues…
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState message="No pending staff-leave or outpass requests at this tier. The review queue is clear." />;
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
      {rows.length > 15 && (
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          Showing 15 of {rows.length} pending items — open the approvals desk for the full list.
        </div>
      )}
    </div>
  );
}

/* ── main content ── */

function DeputyWardenDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

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
    loading: deptsLoading,
    error: deptsError,
    refresh: refreshDepts,
  } = useApiResource<DepartmentsResponse>("/api/departments", { ttlMs: 60_000 });

  // The server scopes these queues to the caller's own stage (deputy_warden /
  // hostel_biometric) — they are the warden's actionable hostel-branch duties.
  const {
    data: staffLeaveQueue,
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
    await Promise.all([refreshPresence(), refreshDepts(), refreshLeave(), refreshOutpass()]);
  }, [refreshPresence, refreshDepts, refreshLeave, refreshOutpass]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  // Presence-matrix derived figures (live gate counts + attendance signal).
  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );
  const gateTotals = gates.map((g) => ({ gate: g, count: Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0) }));

  // Departments.
  const deptRows = departments?.data ?? [];
  const activeDepts = deptRows.filter((d) => d.totalStudents > 0 || d.facultyCount > 0).length;

  // Combined leave + outpass review queue.
  const combinedRows = [
    ...(staffLeaveQueue?.data ?? []),
    ...(outpassQueue?.data ?? []),
  ];
  const combinedSlaBreached = combinedRows.filter(
    (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < Date.now()
  ).length;

  const queuesBusy =
    (leaveLoading || outpassLoading) && !staffLeaveQueue && !outpassQueue;
  const anyQueueError = leaveError || outpassError;

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
          disabled={presenceLoading || deptsLoading || leaveLoading || outpassLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {presenceLoading || deptsLoading || leaveLoading || outpassLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {presenceLoading || leaveLoading || outpassLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Authority note */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 min-w-0">
            Deputy Warden performs delegated hostel duties. Final approval limits are
            explicitly configured, not auto-inherited.
          </p>
        </div>
      </div>

      {/* live-data errors — friendly, never a raw 403 banner */}
      {(presenceError || deptsError) && (
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-3 text-xs text-slate-500 min-w-0">
          Live campus presence or department data is unavailable right now — the panels below
          that depend on it show placeholders; the approvals queues still work.
        </div>
      )}
      {anyQueueError && (
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="min-w-0">Leave / outpass queues failed to load: {String(anyQueueError)}</span>
          <button
            onClick={() => void Promise.all([refreshLeave(), refreshOutpass()])}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1 · Daily Hostel Overview — KPI row */}
      <WidgetBoundary title="Daily Hostel Overview">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader
            icon={LayoutDashboard}
            title="Daily Hostel Overview"
            side={
              presence?.data ? (
                <span className="text-xs text-slate-500 shrink-0">
                  live · updated {new Date(presence.data.lastUpdated).toLocaleTimeString()}
                </span>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 min-w-0">
            <StatCard
              icon={Users}
              label="On Campus Total"
              value={presence ? onCampusTotal : "…"}
              sub="People currently inside all active gates (live presence matrix)"
              accent="text-emerald-400"
              loading={presenceLoading && !presence}
            />
            <StatCard
              icon={DoorOpen}
              label="Active Gates"
              value={presence ? gates.length : "…"}
              sub="Gates reporting to the live presence matrix"
              accent="text-sky-400"
              loading={presenceLoading && !presence}
            />
            <StatCard
              icon={Building2}
              label="Active Departments"
              value={departments ? activeDepts : "…"}
              sub="Departments with students or faculty enrolled"
              accent="text-violet-400"
              loading={deptsLoading && !departments}
            />
            <StatCard
              icon={Inbox}
              label="Pending Review"
              value={combinedRows.length}
              sub="Staff-leave + outpass items awaiting the warden stage"
              accent="text-amber-400"
              loading={queuesBusy}
            />
          </div>
          {/* per-gate counts */}
          {presenceLoading && !presence ? (
            <div className="px-4 pb-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading per-gate counts…
            </div>
          ) : gateTotals.length > 0 ? (
            <div className="px-4 pb-4 border-t border-slate-800 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                On-Campus Count per Gate
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
                {gateTotals.map(({ gate, count }) => (
                  <div
                    key={gate.id}
                    className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300 truncate">{gate.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{gate.code}</p>
                    </div>
                    <p
                      className={`text-lg font-bold shrink-0 ${
                        count > 0 ? "text-emerald-400" : "text-slate-600"
                      }`}
                    >
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 border-t border-slate-800">
              <EmptyState message="No active gates are reporting to the presence matrix right now." />
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* 2 · Resident Attendance */}
      <WidgetBoundary title="Resident Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader
            icon={UserCheck}
            title="Resident Attendance"
            side={<span className="text-xs text-slate-500 shrink-0">derived from live presence</span>}
          />
          {presenceLoading && !presence ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading attendance signal…
            </div>
          ) : presence ? (
            <div className="p-4 space-y-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
                {gateTotals.map(({ gate, count }) => (
                  <div key={gate.id} className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 truncate">
                      {gate.name}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${count > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                      {count}
                    </p>
                    <p className="text-[11px] text-slate-500">present now</p>
                  </div>
                ))}
                {gateTotals.length === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <EmptyState message="No active gates are reporting to the presence matrix right now." />
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
                Per-gate on-campus counts are used as the attendance signal. Staff-level
                attendance detail (rosters, punch records) is admin-scoped and restricted
                at this tier.
              </div>
            </div>
          ) : (
            <EmptyState message="Attendance data unavailable — the presence matrix did not respond for your role." />
          )}
        </div>
      </WidgetBoundary>

      {/* 3 · Entry/Exit Monitoring */}
      <WidgetBoundary title="Entry/Exit Monitoring">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader icon={ScrollText} title="Entry/Exit Monitoring" />
          <EmptyState
            restricted
            message="Entry/exit detail is restricted at this tier. Gate log and live occupancy streams are admin-scoped; the live on-campus totals above are the warden's permitted view of gate activity."
          />
        </div>
      </WidgetBoundary>

      {/* 4 · Leave and Outpass Review */}
      <WidgetBoundary title="Leave and Outpass Review">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader
            icon={FileText}
            title="Leave and Outpass Review"
            side={
              !queuesBusy ? (
                <a
                  href="/hostel/permissions"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                >
                  Open Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : undefined
            }
          />
          {queuesBusy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading review queues…
            </div>
          ) : combinedRows.length === 0 ? (
            <EmptyState message="No pending staff-leave or outpass requests at this tier. The review queue is clear." />
          ) : (
            <>
              <ReviewTable rows={combinedRows} onLoading={false} />
              {combinedSlaBreached > 0 && (
                <div className="px-4 py-3 border-t border-slate-800 text-xs text-rose-400 min-w-0">
                  {combinedSlaBreached} item(s) are past their SLA deadline.
                </div>
              )}
            </>
          )}
        </div>
      </WidgetBoundary>

      {/* 5 · Incident Recording */}
      <WidgetBoundary title="Incident Recording">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader
            icon={BellOff}
            title="Incident Recording"
            side={<span className="text-xs text-slate-500 shrink-0">restricted</span>}
          />
          <EmptyState
            restricted
            message="Incident recording is admin-scoped and not available at this tier. Alerts and incident feeds are not exposed to the deputy warden — escalate incidents verbally or through the principal's desk."
          />
        </div>
      </WidgetBoundary>

      {/* 6 · Shift Handover */}
      <WidgetBoundary title="Shift Handover">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader icon={CheckSquare} title="Shift Handover" />
          <div className="p-4 space-y-4 min-w-0">
            <EmptyState
              restricted
              message="Shift handover log not exposed at this tier. Handover notes are not a delegated duty of the deputy warden."
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
              <p className="text-xs text-slate-500 min-w-0">
                Carry unapproved items forward through the hostel approvals desk instead —
                pending passes and leaves transfer with the tickets.
              </p>
              <a
                href="/hostel/permissions"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
              >
                Hostel Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* 7 · Assigned Tasks */}
      <WidgetBoundary title="Assigned Tasks">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <SectionHeader
            icon={CheckSquare}
            title="Assigned Tasks"
            side={<span className="text-xs text-slate-500 shrink-0">warden-stage items</span>}
          />
          {queuesBusy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading tasks…
            </div>
          ) : combinedRows.length === 0 ? (
            <EmptyState message="No tasks awaiting the warden stage. Nothing needs action right now." />
          ) : (
            <ReviewTable rows={combinedRows} onLoading={false} />
          )}
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            {combinedRows.length > 0
              ? `${combinedRows.length} pending at the warden stage — all are actionable.`
              : "Warden-stage duties derive from the staff-leave and outpass queues shown above."}
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function DeputyWardenDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DeputyWardenDashboardInner />
    </Suspense>
  );
}
