"use client";

import { Suspense, useCallback, useMemo } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import {
  Building2,
  Users,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  UserCheck,
} from "lucide-react";

const MIN_TIER = 55;

/* ── response shapes ── */

interface HodFacultyData {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    unique_id?: string;
    status?: string;
    department_id?: string;
    employee_details?: {
      designation?: string;
      employee_id?: string;
      department?: string;
    } | null;
  }>;
}

interface StudentStatsData {
  onCampusToday: number;
  todayEntries: number;
  todayExits: number;
  total: number;
  byDepartment: Array<{ code: string; name: string; count: number }>;
}

interface PendingCount {
  total?: number;
  data?: unknown[];
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

/* ── main content ── */

function HodDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);
  const deptParam = user?.departmentId || "";

  // HOD-scoped faculty list (route forces department scope for non-admin callers)
  const {
    data: hodFaculty,
    loading: facultyLoading,
    error: facultyError,
    refresh: refreshFaculty,
  } = useApiResource<HodFacultyData>(
    deptParam ? `/api/hod/faculty?departmentId=${encodeURIComponent(deptParam)}` : "/api/hod/faculty",
    { ttlMs: 30_000 }
  );

  const {
    data: students,
    loading: studentsLoading,
    refresh: refreshStudents,
  } = useApiResource<{ success: boolean; data: StudentStatsData }>("/api/students/stats", {
    ttlMs: 30_000,
  });

  // Pending permission requests currently sitting at the HOD stage
  const { data: pending, refresh: refreshPending } = useApiResource<PendingCount>(
    "/api/permissions?workflowType=staff_leave&status=PENDING",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    await Promise.all([refreshFaculty(), refreshStudents(), refreshPending()]);
  }, [refreshFaculty, refreshStudents, refreshPending]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const facultyList = hodFaculty?.data ?? [];
  const onCampus = students?.data?.onCampusToday;
  const pendingCount = pending?.total ?? 0;

  const deptHeadcount = useMemo(
    () => (hodFaculty?.success ? facultyList.length : null),
    [hodFaculty, facultyList.length]
  );

  const loading = facultyLoading || studentsLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">HOD Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
            {deptParam ? ` · dept ${deptParam}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* errors — human-readable, no raw JSON dumps */}
      {facultyError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Faculty panel unavailable: {facultyError}</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Department Headcount"
          value={deptHeadcount ?? "…"}
          sub={deptParam ? `Faculty in dept ${deptParam}` : "All faculty in scope"}
          accent="text-emerald-400"
          loading={facultyLoading && facultyList.length === 0}
        />
        <StatCard
          icon={GraduationCap}
          label="Students On Campus"
          value={onCampus ?? "…"}
          sub={`${students?.data?.todayEntries ?? 0} entries · ${students?.data?.todayExits ?? 0} exits today`}
          accent="text-sky-400"
          loading={studentsLoading && onCampus === undefined}
        />
        <StatCard
          icon={CheckCircle2}
          label="Pending Requests"
          value={pendingCount}
          sub="Staff leave approvals awaiting HOD action"
          accent="text-amber-400"
        />
        <StatCard
          icon={UserCheck}
          label="Active Faculty"
          value={facultyList.filter((f) => f.status === "ACTIVE" || !f.status).length}
          sub="Currently active in your department"
          accent="text-emerald-400"
          loading={facultyLoading && facultyList.length === 0}
        />
      </div>

      {/* alerts — role-scoped conditional alert surface */}
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

      {/* faculty panel */}
      <WidgetBoundary title="Faculty">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Department Faculty
            </h2>
            <span className="text-xs text-slate-500">
              {hodFaculty?.success ? `${facultyList.length} members` : "…"}
            </span>
          </div>

          {facultyLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading faculty…
            </div>
          ) : facultyList.length === 0 ? (
            <div className="p-4">
              <EmptyState
                message={
                  facultyError
                    ? "Could not load the faculty list for your department."
                    : "No faculty members found in this department yet."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Designation</th>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {facultyList.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {f.employee_details?.designation || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {f.employee_details?.employee_id || f.unique_id || f.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                            f.status === "SUSPENDED" || f.status === "LOCKED"
                              ? "text-rose-400 border-rose-400/30 bg-rose-400/10"
                              : "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                          }`}
                        >
                          {f.status || "ACTIVE"}
                        </span>
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

export default function HodDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <HodDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
