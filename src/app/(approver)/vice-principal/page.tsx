"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache, cachedFetch } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  ShieldCheck,

  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  ScrollText,
  Lock,
  Siren,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";

/* ── response shapes ── */

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

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  totalStudents?: number;
  facultyCount?: number;
}

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface StaffStatsResponse {
  summary?: {
    totalStaff: number;
    presentToday: number;
    absentToday: number;
    onLeave: number;
  };
  data?: Array<{
    name: string;
    role: string;
    present: boolean;
  }>;
}

/* ── Probe result type: distinguish 403 from real errors ── */

interface ProbeResult<T = unknown> {
  data: T | null;
  restricted: boolean;   // true when HTTP 403 → show friendly restricted empty-state
  error: string | null;   // set for real (non-403) errors
  loading: boolean;
}

/**
 * Probe a read-only endpoint that may return 403 for the VP tier.
 * On success the data is cached (ttlMs); on 403 the panel shows a clean
 * "restricted at this tier" empty-state instead of an error banner.
 */
function useProbe<T>(url: string | null, ttlMs = 30_000): ProbeResult<T> {
  const [state, setState] = useState<ProbeResult<T>>({
    data: null,
    restricted: false,
    error: null,
    loading: true,
  });

  const probe = useCallback(async () => {
    if (!url) {
      setState({ data: null, restricted: false, error: null, loading: false });
      return;
    }
    // cachedFetch caches successful bodies for ttlMs — a 403 is NOT cached,
    // so the probe re-runs on every refresh (cheap: one authed GET).
    try {
      const data = await cachedFetch<T>(url, { ttlMs });
      setState({ data, restricted: false, error: null, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      if (msg.includes("403")) {
        setState({ data: null, restricted: true, error: null, loading: false });
      } else {
        setState({ data: null, restricted: false, error: msg, loading: false });
      }
    }
  }, [url, ttlMs]);

  useEffect(() => {
    void probe();
  }, [probe]);

  // Re-probe on manual refresh (403s are uncached, so this is a real re-fetch)
  useEffect(() => {
    const handler = () => void probe();
    window.addEventListener("vp-probe-refresh", handler);
    return () => window.removeEventListener("vp-probe-refresh", handler);
  }, [probe]);

  return state;
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

function EmptyState({
  message,
  restricted = false,
}: {
  message: string;
  restricted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 sm:p-8 text-center text-sm min-w-0 ${
        restricted
          ? "border-slate-800 bg-slate-800/20 text-slate-500"
          : "border-dashed border-slate-700 bg-slate-800/30 text-slate-500"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {restricted ? (
          <Lock className="w-5 h-5 text-slate-600 shrink-0" />
        ) : (
          <Inbox className="w-5 h-5 text-slate-600 shrink-0" />
        )}
        <p className="max-w-md text-center">{message}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        {sub && <p className="text-xs text-slate-600 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── panel wrappers ── */

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <WidgetBoundary title={title}>
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">{children}</div>
    </WidgetBoundary>
  );
}

/* ── main content ── */

function VicePrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "vice_principal") as Role;
  const tier = getRoleTier(role);

  /* ── core fetch: VP-stage permission queue (200 for VP) ── */
  const {
    data: vpQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  /* ── fetches that are 200 for VP ── */
  const { data: departments } = useApiResource<{ success: boolean; data: DepartmentRow[] }>(
    "/api/departments",
    { ttlMs: 60_000 }
  );

  const { data: matrix } = useApiResource<{ success: boolean; data: PresenceMatrixData }>(
    "/api/occupancy/presence-matrix",
    { ttlMs: 30_000 }
  );

  /* ── probes: endpoints that may be 403 at the VP tier ── */
  // /api/staff/attendance → 403 for VP (admin-only)
  const staffAttendance = useProbe<StaffStatsResponse>("/api/staff/attendance", 30_000);
  // /api/staff/stats → 403 for VP (admin-only)
  const staffStats = useProbe<StaffStatsResponse>("/api/staff/stats", 30_000);

  /* ── derived values ── */
  const rows = vpQueue?.data ?? [];
  const total = vpQueue?.total ?? rows.length;
  const slaBreached = rows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const deptList = (departments?.data ?? []) as DepartmentRow[];

  /* gate × role → per-gate totals + on-campus total */
  const { gateTotals, onCampus } = useMemo(() => {
    const gates = matrix?.data?.gates ?? [];
    const m = matrix?.data?.matrix ?? {};
    const roles = matrix?.data?.roles ?? [];
    const gateTotals = gates.map((g) => ({
      ...g,
      total: roles.reduce((sum, r) => sum + (m[g.id]?.[r] ?? 0), 0),
    }));
    const onCampus = gateTotals.reduce((sum, g) => sum + g.total, 0);
    return { gateTotals, onCampus };
  }, [matrix]);

  /* client-side: group VP-stage permissions by workflow_type */
  const workflowCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.workflow_type] = (counts[r.workflow_type] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const delegated = rows;

  /* alerts: /api/alerts is 403 for VP → KPI shows "restricted" */
  const alertsProbe = useProbe<{ data?: unknown; total?: number }>(
    "/api/alerts?resolved=false",
    30_000
  );
  const alertsRestricted = alertsProbe.restricted;
  const alertsLoading = alertsProbe.loading;
  const alertsCount =
    alertsProbe.data?.total != null
      ? alertsProbe.data.total
      : Array.isArray(alertsProbe.data?.data)
        ? (alertsProbe.data?.data as unknown[]).length
        : 0;

  const alertsValue: React.ReactNode = alertsLoading
    ? "…"
    : alertsRestricted
      ? "Restricted"
      : alertsCount;

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshQueue(),
      new Promise<void>((resolve) => {
        const handler = () => resolve();
        window.addEventListener("vp-probe-refresh", handler, { once: true });
        window.dispatchEvent(new Event("vp-probe-refresh"));
      }),
    ]);
  }, [refreshQueue]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const [activeTab, setActiveTab] = useState<"all" | "exam" | "memo" | "staff_leave">("all");
  const filtered =
    activeTab === "all" ? rows : rows.filter((r) => r.workflow_type === activeTab);

  const anyLoading =
    (queueLoading && !vpQueue) ||
    staffAttendance.loading ||
    staffStats.loading;

  /* ── render: department + workflow summary table (panel 2) ── */
  const deptAndWorkflowTable = (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
            <th className="text-left px-3 py-2">Department</th>
            <th className="text-left px-3 py-2">HOD</th>
            <th className="text-right px-3 py-2">Students</th>
            <th className="text-right px-3 py-2">Faculty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {deptList.map((d) => (
            <tr key={d.code} className="hover:bg-slate-800/30">
              <td className="px-3 py-2 text-slate-200">{d.name}</td>
              <td className="px-3 py-2 text-slate-400">{d.hod || "—"}</td>
              <td className="px-3 py-2 text-right text-slate-300">{d.totalStudents ?? "—"}</td>
              <td className="px-3 py-2 text-right text-slate-300">{d.facultyCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* VP-stage permission counts by workflow_type */}
      {rows.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            VP-Stage Queue by Workflow
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(workflowCounts).map(([wf, count]) => (
              <span
                key={wf}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs text-sky-400"
              >
                {wf.replace(/_/g, " ")}
                <span className="font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── staff stats table (panel 6) — render only when NOT restricted ── */
  const staffStatsTable = (data: StaffStatsResponse | null) => {
    if (!data) return null;
    const s = data.summary;
    if (!s) return null;
    const pct = s.totalStaff > 0 ? Math.round((s.presentToday / s.totalStaff) * 100) : 0;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
        {[
          { label: "Total Staff", value: s.totalStaff, color: "text-white" },
          { label: "Present", value: s.presentToday, color: "text-emerald-400" },
          { label: "Absent", value: s.absentToday, color: "text-rose-400" },
          { label: "On Leave", value: s.onLeave, color: "text-amber-400" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-800/40 p-3 min-w-0">
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
        <p className="col-span-full text-xs text-slate-600">
          Attendance rate: {pct}%
        </p>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* ── Page toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={queueLoading || staffAttendance.loading || staffStats.loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {queueLoading || staffAttendance.loading || staffStats.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {queueLoading || staffAttendance.loading || staffStats.loading
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </div>

      {/* global error banner for the core queue */}
      {queueError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Escalation queue loading failed: {queueError}</span>
          </span>
          <button
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1 · Executive Overview ── */}
      <Panel title="Executive Overview">
        <SectionHeader
          icon={Inbox}
          title="Executive Overview"
          sub="Institutional summary for the Vice Principal"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          <StatCard
            icon={Inbox}
            label="VP Pending"
            value={vpQueue ? total : "…"}
            sub="Requests at the Vice Principal stage"
            accent="text-sky-400"
            loading={queueLoading && !vpQueue}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={vpQueue ? slaBreached : "…"}
            sub="VP queue past deadline"
            accent="text-amber-400"
            loading={queueLoading && !vpQueue}
          />
          <StatCard
            icon={Siren}
            label="Active Alerts"
            value={alertsValue}
            sub={alertsRestricted ? "Restricted at this tier" : "Unresolved campus alerts"}
            accent={
              alertsRestricted
                ? "text-slate-500"
                : alertsCount > 0
                  ? "text-rose-400"
                  : "text-emerald-400"
            }
            loading={alertsLoading}
          />
          <StatCard
            icon={MapPin}
            label="On Campus"
            value={matrix ? onCampus : "…"}
            sub="Across all active gates"
            accent="text-emerald-400"
            loading={!matrix}
          />
        </div>
      </Panel>

      {/* ── 2 · Academic and Department Analytics ── */}
      <Panel title="Academic and Department Analytics">
        <SectionHeader
          icon={Building2}
          title="Academic & Department Analytics"
          sub="Per-department summary with VP-stage queue breakdown"
        />
        {anyLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading analytics…
          </div>
        ) : deptList.length === 0 ? (
          <EmptyState message="No department data available." />
        ) : (
          deptAndWorkflowTable
        )}
      </Panel>

      {/* ── 3 · Attendance Exceptions ── */}
      <Panel title="Attendance Exceptions">
        <SectionHeader
          icon={CheckCircle2}
          title="Attendance Exceptions"
          sub="Staff attendance detail"
        />
        {staffAttendance.loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking access…
          </div>
        ) : staffAttendance.restricted ? (
          <EmptyState
            restricted
            message="Attendance exception detail is restricted at the Vice Principal tier. It is available to admin and sysadmin roles. If you need access, contact your institution administrator."
          />
        ) : staffAttendance.error ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 min-w-0">
            Attendance data unavailable right now — try the Refresh button above.
          </div>
        ) : (
          staffAttendance.data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
              {(() => {
                const s = staffAttendance.data!.summary;
                if (!s)
                  return <EmptyState message="No attendance data recorded yet." />;
                const pct =
                  s.totalStaff > 0
                    ? Math.round((s.presentToday / s.totalStaff) * 100)
                    : 0;
                return [
                  { label: "Present", value: s.presentToday, color: "text-emerald-400" },
                  { label: "Absent", value: s.absentToday, color: "text-rose-400" },
                  { label: "On Leave", value: s.onLeave, color: "text-amber-400" },
                  { label: "Rate", value: `${pct}%`, color: "text-white" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <EmptyState message="No attendance exception data recorded yet." />
          )
        )}
      </Panel>

      {/* ── 4 · Gate and Incident Summary ── */}
      <Panel title="Gate and Incident Summary">
        <SectionHeader
          icon={MapPin}
          title="Gate & Incident Summary"
          sub="Per-gate on-campus presence"
        />
        {!matrix ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading gate data…
          </div>
        ) : gateTotals.length === 0 ? (
          <EmptyState message="No active gates configured." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left px-3 py-2">Gate</th>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-right px-3 py-2">On Campus</th>
                  <th className="text-right px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gateTotals.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-200">{g.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{g.code}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-bold ${
                          g.total > 0 ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {g.total}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          g.total > 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {g.total > 0 ? "Active" : "Clear"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Incident note: /api/alerts is 403 for VP */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 min-w-0">
          <Siren className="w-3.5 h-3.5 shrink-0" />
          Incident details are admin-scoped and not shown at the Vice Principal tier.
          Use the incident feed on the admin dashboard for full incident data.
        </div>
      </Panel>

      {/* ── 5 · Pending Approvals (core escalation queue) ── */}
      <Panel title="Pending Approvals">
        <SectionHeader
          icon={Inbox}
          title="Pending Approvals — VP Stage"
          sub="Requests escalated to the Vice Principal for review"
        />
        {/* workflow filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mb-3 min-w-0">
          {(
            [
              { id: "all", label: "All" },
              { id: "exam", label: "Exam" },
              { id: "memo", label: "Memo" },
              { id: "staff_leave", label: "Staff Leave" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 ${
                activeTab === t.id
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              {t.label}
              {t.id !== "all"
                ? ` (${workflowCounts[t.id] ?? 0})`
                : ` (${rows.length})`}
            </button>
          ))}
        </div>
        {queueLoading && !vpQueue ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading queue…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No pending items at the Vice Principal stage. The queue is clear." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left px-3 py-2">Ticket</th>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Workflow</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-white font-mono text-xs whitespace-nowrap">
                      {r.ticket_number}
                    </td>
                    <td className="px-3 py-2 text-slate-300 min-w-0">
                      {r.student?.name || "—"}
                      {r.student?.student_details?.roll
                        ? ` · ${r.student.student_details.roll}`
                        : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-400 capitalize whitespace-nowrap">
                      {r.workflow_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                          r.status === "PENDING"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                            : "border-slate-700 bg-slate-800 text-slate-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
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
              <p className="mt-2 text-xs text-slate-600">
                Showing {Math.min(filtered.length, 15)} of {rows.length} items.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* ── 6 · Staff and Operational Reports ── */}
      <Panel title="Staff and Operational Reports">
        <SectionHeader
          icon={FileText}
          title="Staff & Operational Reports"
          sub="Institutional staffing summary"
        />
        {staffStats.loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking access…
          </div>
        ) : staffStats.restricted ? (
          <EmptyState
            restricted
            message="Staff and operational reports are restricted at the Vice Principal tier. Detailed staffing analytics are available to admin and sysadmin. If you need this data, contact your institution administrator."
          />
        ) : staffStats.error ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 min-w-0">
            Reports unavailable right now — try the Refresh button above.
          </div>
        ) : staffStats.data ? (
          staffStatsTable(staffStats.data)
        ) : (
          <EmptyState message="No staff report data available yet." />
        )}
      </Panel>

      {/* ── 7 · Delegated Tasks ── */}
      <Panel title="Delegated Tasks">
        <SectionHeader
          icon={CalendarClock}
          title="Delegated Tasks"
          sub="Items escalated to you for review"
        />
        {queueLoading && !vpQueue ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading tasks…
          </div>
        ) : delegated.length === 0 ? (
          <EmptyState message="No delegated tasks at the Vice Principal stage." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <ul className="divide-y divide-slate-800/60">
              {delegated.slice(0, 10).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-2 min-w-0 hover:bg-slate-800/20 rounded-lg px-2"
                >
                  <span className="font-mono text-xs text-sky-400 shrink-0 w-28 truncate">
                    {r.ticket_number}
                  </span>
                  <span className="text-sm text-slate-300 truncate min-w-0 flex-1">
                    {r.student?.name || "Unknown requester"}
                    {" · "}
                    <span className="text-slate-500">
                      {r.workflow_type.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {r.sla_deadline
                      ? new Date(r.sla_deadline).toLocaleDateString()
                      : "No SLA"}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      r.status === "PENDING"
                        ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                        : "bg-slate-700 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
            {delegated.length > 10 && (
              <p className="mt-2 text-xs text-slate-600">
                Showing {10} of {delegated.length} delegated tasks.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* ── 8 · Reports and Approvals (authority note) ── */}
      <Panel title="Reports and Approvals">
        <SectionHeader
          icon={ScrollText}
          title="Reports & Approvals"
          sub="Authority boundary"
        />
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 sm:p-5 text-sm text-slate-300 space-y-3 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-white">Delegated Authority</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The Vice Principal handles{" "}
                <strong className="text-sky-300">delegated institutional operations</strong>.
                Principal-level approval powers are{" "}
                <strong className="text-sky-300">configurable</strong>, not automatically
                inherited. Delegation scope is set by the institution administrator via
                role permissions.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 min-w-0">
            <ClipboardCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-white">Approvals Desk</p>
              <p className="text-xs text-slate-400 mt-1">
                For full approval actions (forward, reject with remarks, bulk operations),
                use the shared approvals desk.
              </p>
            </div>
          </div>
          <a
            href="/exam/permissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-colors"
          >
            Open Approvals Desk
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </Panel>

      <DevContactStrip />
    </div>
  );
}

export default function VicePrincipalDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VicePrincipalDashboardInner />
    </Suspense>
  );
}
