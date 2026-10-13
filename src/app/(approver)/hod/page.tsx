"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import {

  Users,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,

  Inbox,
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

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  student_user_id?: string | null;
  created_at?: string;
  description?: string;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
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
        <Icon className="w-4 h-4 text-emerald-400" />
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

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
      >
        <Loader2 className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}

/* ── main content ── */

function HodDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);
  const deptParam = user?.departmentId || "";

  const {
    data: hodFaculty,
    loading: facultyLoading,
    error: facultyError,
    refresh: refreshFaculty,
  } = useApiResource<HodFacultyData>(
    deptParam
      ? `/api/hod/faculty?departmentId=${encodeURIComponent(deptParam)}`
      : "/api/hod/faculty",
    { ttlMs: 30_000 }
  );

  const {
    data: students,
    loading: studentsLoading,
    error: studentsError,
    refresh: refreshStudents,
  } = useApiResource<{ success: boolean; data: StudentStatsData }>("/api/students/stats", {
    ttlMs: 30_000,
  });

  // Branch-scoped queue of pending permission requests awaiting HOD-stage action
  const {
    data: pending,
    loading: pendingLoading,
    error: pendingError,
    refresh: refreshPending,
  } = useApiResource<PermissionListData>(
    "/api/permissions?workflowType=staff_leave&status=PENDING",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    await Promise.all([refreshFaculty(), refreshStudents(), refreshPending()]);
  }, [refreshFaculty, refreshStudents, refreshPending]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const facultyList = hodFaculty?.data ?? [];
  const pendingRows = useMemo<PermissionRow[]>(() => {
    const rows = pending?.data;
    return Array.isArray(rows) ? rows : [];
  }, [pending]);

  const pendingCount = pending?.total ?? pendingRows.length;

  const approvalsToday = useMemo(() => {
    if (pendingRows.length === 0) return 0;
    const today = new Date().toDateString();
    return pendingRows.filter((r) => r.created_at && new Date(r.created_at).toDateString() === today).length;
  }, [pendingRows]);

  const deptStudentCount = useMemo(() => {
    const row = students?.data?.byDepartment?.find((d) => d.code === deptParam || d.name === deptParam);
    return row?.count ?? null;
  }, [students, deptParam]);

  const anyError = !!(facultyError || studentsError || pendingError);
  const loading = facultyLoading || studentsLoading || pendingLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      {/* header */}
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
            {deptParam ? ` · dept ${deptParam}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {anyError && (
        <ErrorBanner
          message={facultyError || studentsError || pendingError || "Some panels failed to load."}
          onRetry={() => void refresh()}
        />
      )}

      {/* KPI row */}
      {deptParam ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Inbox}
            label="Branch Pending"
            value={pendingCount}
            sub="Permissions awaiting HOD-stage action"
            accent="text-amber-400"
            loading={pendingLoading}
          />
          <StatCard
            icon={GraduationCap}
            label="Branch Students"
            value={deptStudentCount ?? "…"}
            sub={deptStudentCount === null ? `Students in dept ${deptParam}` : `Dept ${deptParam} · ${students?.data?.total ?? 0} total campus`}
            accent="text-emerald-400"
            loading={studentsLoading && deptStudentCount === null}
          />
          <StatCard
            icon={CheckCircle2}
            label="Approvals Today"
            value={approvalsToday}
            sub="Requests raised today in your queue"
            accent="text-sky-400"
            loading={pendingLoading && pendingRows.length === 0}
          />
          <StatCard
            icon={Users}
            label="Department Faculty"
            value={hodFaculty?.success ? facultyList.length : "…"}
            sub="Faculty members on branch"
            accent="text-emerald-400"
            loading={facultyLoading && facultyList.length === 0}
          />
        </div>
      ) : (
        <EmptyState message="No branch assigned — ask your sysadmin to assign a department" />
      )}

      {deptParam && (
        <>
          {/* branch-scoped pending approvals */}
          <WidgetBoundary title="Pending Approvals">
            <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  Branch Pending Queue
                </h2>
                <span className="text-xs text-slate-500">
                  {pendingRows.length > 0 ? `${pendingRows.length} waiting` : "queue clear"}
                </span>
              </div>
              {pendingLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading pending requests…
                </div>
              ) : pendingRows.length === 0 ? (
                <div className="p-4">
                  <EmptyState message="No pending approvals in your branch queue." />
                </div>
              ) : (
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-4 py-3">Ticket</th>
                        <th className="text-left px-4 py-3">Workflow</th>
                        <th className="text-left px-4 py-3">Requester</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Raised</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {pendingRows.slice(0, 15).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-white font-mono text-xs">
                            {r.ticket_number || r.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {r.workflow_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {r.student_user_id ? r.student_user_id.slice(0, 8) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-amber-400 border-amber-400/30 bg-amber-400/10">
                              {r.status || "PENDING"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {r.created_at
                              ? new Date(r.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                <div className="overflow-x-auto min-w-0">
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
                            {f.employee_details?.employee_id || f.id.slice(0, 8)}
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
        </>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function HodDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HodDashboardInner />
    </Suspense>
  );
}
