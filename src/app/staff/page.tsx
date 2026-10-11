"use client";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import {
  Users,
  UserCheck,
  Clock,
  Briefcase,
  Building2,
  CalendarClock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const MIN_TIER = 45;

/* ── response shapes (mirror the route handlers — all read-only aggregations) ── */

interface StaffStatsData {
  total: number;
  active: number;
  suspended: number;
  byGroup: Array<{
    group: string;
    count: number;
    color: string;
    roles: Array<{ role: string; count: number }>;
  }>;
  byDepartment: Array<{ code: string; name: string; count: number }>;
  byStaffCategory: Array<{ category: string; count: number }>;
  byDesignation: Array<{ designation: string; count: number }>;
}

interface AttendanceSummary {
  totalStaff: number;
  presentToday: number;
  currentlyInside: number;
  currentlyOutside: number;
  warningCount: number;
  overallAttendanceRate: number;
}

interface AttendanceRecord {
  id: string;
  uniqueId: string;
  fullName: string;
  designation: string;
  department: string;
  status: "INSIDE" | "OUTSIDE" | "ABSENT";
  firstInTime: string | null;
  punctualityStatus: "ON_TIME" | "LATE" | "NOT_CHECKED_IN";
  recentLogs: Array<{ id: string; timestamp: string; direction: string; gate: string }>;
}

interface AttendanceData {
  success: boolean;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
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
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 font-mono">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AttendanceBadge({ status }: { status: AttendanceRecord["status"] }) {
  const map: Record<string, string> = {
    INSIDE: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    OUTSIDE: "text-sky-400 border-sky-400/30 bg-sky-400/10",
    ABSENT: "text-slate-500 border-slate-600/30 bg-slate-500/10",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.ABSENT}`}
    >
      {status === "ABSENT" ? "Not on campus" : status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

/* ── main content ── */

function StaffDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useApiResource<{ success: boolean; data: StaffStatsData }>("/api/staff/stats", {
    ttlMs: 30_000,
  });

  const {
    data: attendance,
    loading: attLoading,
    error: attError,
    refresh: refreshAtt,
  } = useApiResource<AttendanceData>("/api/staff/attendance", { ttlMs: 30_000 });

  const { data: leaveData, refresh: refreshLeaves } = useApiResource<{ total?: number }>(
    "/api/permissions?workflowType=staff_leave&status=PENDING",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    await Promise.all([refreshStats(), refreshAtt(), refreshLeaves()]);
  }, [refreshStats, refreshAtt, refreshLeaves]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const s = stats?.data;
  const attSummary = attendance?.summary;
  const attRecords = attendance?.records ?? [];
  const pendingLeaves = leaveData?.total ?? 0;

  // The current user's own attendance record (matches by user id)
  const ownRecord = user ? attRecords.find((r) => r.id === user.id) : null;

  const onDutyToday = attSummary?.currentlyInside ?? 0;
  const maxGroup = s ? Math.max(...s.byGroup.map((g) => g.count), 1) : 1;
  const maxDept = s ? Math.max(...s.byDepartment.map((d) => d.count), 1) : 1;
  const maxDesig = s ? Math.max(...s.byDesignation.map((d) => d.count), 1) : 1;

  const hasAnyData = !!s || attRecords.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Staff Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={statsLoading || attLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {statsLoading || attLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {statsLoading || attLoading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* errors */}
      {(statsError || attError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {statsError ? `Staff stats: ${statsError}` : `Attendance: ${attError}`}
          </span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Staff Total"
          value={s?.total ?? "…"}
          sub="All staff members in the system"
          accent="text-white"
          loading={statsLoading && !s}
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={s?.active ?? "…"}
          sub={`${s?.suspended ?? 0} suspended / locked`}
          accent="text-emerald-400"
          loading={statsLoading && !s}
        />
        <StatCard
          icon={Building2}
          label="On Duty Today"
          value={onDutyToday}
          sub={`${attSummary?.currentlyOutside ?? 0} outside · ${attSummary?.overallAttendanceRate ?? 0}% attendance rate`}
          accent="text-sky-400"
          loading={attLoading && !attSummary}
        />
        <StatCard
          icon={Briefcase}
          label="Pending Leaves"
          value={pendingLeaves}
          sub="Staff leave requests awaiting approval"
          accent="text-amber-400"
        />
      </div>

      {/* empty state when nothing loaded */}
      {!hasAnyData && !statsLoading && !attLoading && (
        <EmptyState message="No staff data available yet. The roster is empty or the API could not be reached." />
      )}

      {/* role-group infographic */}
      {s && s.byGroup.length > 0 && (
        <WidgetBoundary title="Role Groups">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
              Role Hierarchy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {s.byGroup.map((g) => (
                <div key={g.group} className="space-y-2 rounded-lg bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{g.group}</span>
                    <span className="text-xs text-slate-400">{g.count} members</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${g.color}`}
                      style={{ width: `${Math.round((g.count / maxGroup) * 100)}%` }}
                    />
                  </div>
                  <ul className="space-y-1">
                    {g.roles.map((r) => (
                      <li key={r.role} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 capitalize">
                          {r.role.replace(/_/g, " ")}
                        </span>
                        <span className="text-slate-300 font-mono">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </WidgetBoundary>
      )}

      {/* department distribution + designations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetBoundary title="Departments">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
              Department Distribution
            </h2>
            {s && s.byDepartment.length > 0 ? (
              <div className="space-y-3">
                {s.byDepartment.map((d) => (
                  <BarRow
                    key={d.code}
                    label={d.name}
                    count={d.count}
                    max={maxDept}
                    color="bg-emerald-400"
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No departments assigned yet." />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Designations">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
              Top Designations
            </h2>
            {s && s.byDesignation.length > 0 ? (
              <div className="space-y-3">
                {s.byDesignation.map((d) => (
                  <BarRow
                    key={d.designation}
                    label={d.designation}
                    count={d.count}
                    max={maxDesig}
                    color="bg-blue-400"
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No designation data available." />
            )}
          </div>
        </WidgetBoundary>
      </div>

      {/* own attendance card */}
      <WidgetBoundary title="My Attendance Today">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              My Attendance Today
            </h2>
          </div>

          {!attRecords.length && attLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : ownRecord ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg bg-slate-800/40 p-3">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <AttendanceBadge status={ownRecord.status} />
              </div>
              <div className="rounded-lg bg-slate-800/40 p-3">
                <p className="text-xs text-slate-500 mb-1">First Check-in</p>
                <p className="text-lg font-bold text-white">{ownRecord.firstInTime || "—"}</p>
                <p className="text-xs mt-1">
                  {ownRecord.punctualityStatus === "ON_TIME" && (
                    <span className="text-emerald-400">On time</span>
                  )}
                  {ownRecord.punctualityStatus === "LATE" && (
                    <span className="text-amber-400">Late arrival</span>
                  )}
                  {ownRecord.punctualityStatus === "NOT_CHECKED_IN" && (
                    <span className="text-slate-500">Not checked in</span>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/40 p-3 sm:col-span-2">
                <p className="text-xs text-slate-500 mb-2">Recent Gate Logs</p>
                {ownRecord.recentLogs?.length ? (
                  <ul className="space-y-1.5">
                    {ownRecord.recentLogs.slice(0, 4).map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between text-xs text-slate-400"
                      >
                        <span>{l.gate}</span>
                        <span className={l.direction === "IN" ? "text-emerald-400" : "text-sky-400"}>
                          {l.direction === "IN" ? "Entered" : "Exited"} · {l.timestamp}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No gate activity recorded today.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              No attendance record found for your account today.
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* staff attendance table */}
      <WidgetBoundary title="Staff Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Today&apos;s Staff Attendance
            </h2>
            <span className="text-xs text-slate-500">
              {attSummary ? `${attSummary.presentToday}/${attSummary.totalStaff} present` : "…"}
            </span>
          </div>

          {attLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading attendance…
            </div>
          ) : attRecords.length === 0 ? (
            <div className="p-4">
              <EmptyState message="No staff attendance records yet." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Designation</th>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">First In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attRecords.slice(0, 20).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{r.fullName}</td>
                      <td className="px-4 py-3 text-slate-400">{r.designation}</td>
                      <td className="px-4 py-3 text-slate-400">{r.department}</td>
                      <td className="px-4 py-3">
                        <AttendanceBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{r.firstInTime || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <StaffDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
