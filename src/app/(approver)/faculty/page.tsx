"use client";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/lib/types";
import {
  GraduationCap,
  CalendarCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Building2,
} from "lucide-react";

const MIN_TIER = 45;

interface FacultyAttendanceData {
  success: boolean;
  summary: {
    totalFaculty: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    lateArrivals: number;
    absentCount: number;
    overallAttendanceRate: number;
  };
  departmentSummaries: DepartmentAttendanceSummary[];
  records: FacultyMemberAttendance[];
}

interface StudentStatsData {
  onCampusToday: number;
  todayEntries: number;
  total: number;
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

function StatusPill({ status }: { status: FacultyMemberAttendance["status"] }) {
  const map: Record<string, string> = {
    INSIDE: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    OUTSIDE: "text-sky-400 border-sky-400/30 bg-sky-400/10",
    ABSENT: "text-slate-500 border-slate-600/30 bg-slate-500/10",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.ABSENT}`}>
      {status === "ABSENT" ? "Not on campus" : status}
    </span>
  );
}

function PunctualityBadge({ p }: { p: FacultyMemberAttendance["punctualityStatus"] }) {
  if (p === "ON_TIME")
    return <span className="text-xs text-emerald-400">On time</span>;
  if (p === "LATE") return <span className="text-xs text-amber-400">Late</span>;
  return <span className="text-xs text-slate-500">Not checked in</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

/* ── main content ── */

function FacultyDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "faculty") as Role;
  const tier = getRoleTier(role);

  const {
    data: facultyAtt,
    loading: facultyLoading,
    error: facultyError,
    refresh: refreshFaculty,
  } = useApiResource<FacultyAttendanceData>("/api/faculty/attendance", { ttlMs: 30_000 });

  const {
    data: students,
    loading: studentsLoading,
    refresh: refreshStudents,
  } = useApiResource<{ success: boolean; data: StudentStatsData }>("/api/students/stats", {
    ttlMs: 30_000,
  });

  const { data: leaveData, refresh: refreshLeaves } = useApiResource<{ total?: number }>(
    "/api/permissions?workflowType=staff_leave&status=PENDING",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    await Promise.all([refreshFaculty(), refreshStudents(), refreshLeaves()]);
  }, [refreshFaculty, refreshStudents, refreshLeaves]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const sum = facultyAtt?.summary;
  const records = facultyAtt?.records ?? [];
  const depts = facultyAtt?.departmentSummaries ?? [];
  const onCampus = students?.data?.onCampusToday;
  const pendingLeaves = leaveData?.total ?? 0;

  // Attendance rate of faculty members scoped to the caller's department
  const attendanceRate = sum?.overallAttendanceRate ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Faculty Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={facultyLoading || studentsLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {facultyLoading || studentsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {facultyLoading || studentsLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* errors — never dump raw JSON to the user */}
      {facultyError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Faculty data unavailable: {facultyError}</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarCheck}
          label="Classes Today"
          value={sum?.presentToday ?? "…"}
          sub={`${sum?.totalFaculty ?? 0} faculty on roster`}
          accent="text-emerald-400"
          loading={facultyLoading && !sum}
        />
        <StatCard
          icon={CheckCircle2}
          label="Attendance Rate"
          value={attendanceRate === null ? "…" : `${attendanceRate}%`}
          sub={`${sum?.lateArrivals ?? 0} late · ${sum?.absentCount ?? 0} absent today`}
          accent={
            attendanceRate !== null && attendanceRate < 75
              ? "text-amber-400"
              : "text-emerald-400"
          }
          loading={facultyLoading && attendanceRate === null}
        />
        <StatCard
          icon={Users}
          label="Students On Campus"
          value={onCampus ?? "…"}
          sub={`${students?.data?.todayEntries ?? 0} entries today`}
          accent="text-sky-400"
          loading={studentsLoading && onCampus === undefined}
        />
        <StatCard
          icon={Building2}
          label="Pending Approvals"
          value={pendingLeaves}
          sub="Staff leave requests at this stage"
          accent="text-amber-400"
        />
      </div>

      {/* empty state */}
      {!records.length && !facultyLoading && (
        <EmptyState message="No faculty attendance records yet. Records appear after the first gate check-in." />
      )}

      {/* role-scoped alerts */}
      <WidgetBoundary title="Alerts">
        <ConditionalAlert
          ctx={{
            role,
            userId: user?.id ?? "unknown",
            gateId: user?.gateId ?? null,
            departmentId: user?.departmentId ?? null,
            assignedHostel: user?.assignedHostel ?? null,
            metrics: {},
          }}
          limit={5}
        />
      </WidgetBoundary>

      {/* department summaries */}
      {depts.length > 0 && (
        <WidgetBoundary title="Department Overview">
          <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Department Attendance
              </h2>
            </div>
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-left px-4 py-3">Faculty</th>
                    <th className="text-left px-4 py-3">Present</th>
                    <th className="text-left px-4 py-3">Inside Now</th>
                    <th className="text-left px-4 py-3">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {depts.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{d.department}</td>
                      <td className="px-4 py-3 text-slate-400">{d.totalFaculty}</td>
                      <td className="px-4 py-3 text-slate-300">{d.presentToday}</td>
                      <td className="px-4 py-3 text-emerald-400">{d.currentlyInside}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{d.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetBoundary>
      )}

      {/* class attendance table */}
      <WidgetBoundary title="Faculty Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Class Attendance
            </h2>
            <span className="text-xs text-slate-500">
              {sum ? `${sum.presentToday}/${sum.totalFaculty} present today` : "…"}
            </span>
          </div>

          {facultyLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading faculty attendance…
            </div>
          ) : records.length === 0 ? (
            <div className="p-4">
              <EmptyState message="No faculty attendance records available." />
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Designation</th>
                    <th className="text-left px-4 py-3">Dept</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">In</th>
                    <th className="text-left px-4 py-3">Out</th>
                    <th className="text-left px-4 py-3">Punctual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.slice(0, 25).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{r.fullName}</td>
                      <td className="px-4 py-3 text-slate-400">{r.designation}</td>
                      <td className="px-4 py-3 text-slate-400">{r.department}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{r.firstInTime || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{r.lastOutTime || "—"}</td>
                      <td className="px-4 py-3">
                        <PunctualityBadge p={r.punctualityStatus} />
                      </td>
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

export default function FacultyDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <FacultyDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
