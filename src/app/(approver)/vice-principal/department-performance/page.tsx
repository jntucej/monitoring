"use client";

import { Suspense, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, Building2, TrendingUp, Users, School } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

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

interface CampusAnalyticsResponse {
  success: boolean;
  data?: {
    role?: string;
    metrics?: Array<{ key: string; label: string; value: number; unit?: string }>;
    seriesData?: Array<Record<string, string | number>>;
  };
}

function VpDepartmentPerformanceInner() {
  const {
    data: departments,
    loading: deptLoading,
    error: deptError,
    refresh: refreshDepts,
  } = useApiResource<DepartmentsResponse>("/api/departments", { ttlMs: 60_000 });

  const { data: analytics, refresh: refreshAnalytics } =
    useApiResource<CampusAnalyticsResponse>(
      "/api/campus-extra/analytics?role=vice_principal",
      { ttlMs: 30_000 }
    );

  usePolling(refreshDepts, { intervalMs: 60_000, enabled: true });

  const deptList = (departments?.data ?? []) as DepartmentRow[];

  const comparison = useMemo(() => {
    const sorted = [...deptList].sort((a, b) => (b.totalStudents ?? 0) - (a.totalStudents ?? 0));
    const max = Math.max(1, ...sorted.map((d) => d.totalStudents ?? 0));
    return sorted.map((d, i) => ({
      ...d,
      rank: i + 1,
      pct: Math.round(((d.totalStudents ?? 0) / max) * 100),
    }));
  }, [deptList]);

  const totals = useMemo(() => {
    return {
      students: deptList.reduce((sum, d) => sum + (d.totalStudents ?? 0), 0),
      faculty: deptList.reduce((sum, d) => sum + (d.facultyCount ?? 0), 0),
      departments: deptList.length,
    };
  }, [deptList]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Department Performance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Cross-Department Comparison
            </span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 min-w-0">
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <School className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Departments</span>
              </div>
              <p className="text-xl font-bold text-white">{totals.departments}</p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Total Students</span>
              </div>
              <p className="text-xl font-bold text-sky-400">{totals.students || "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Faculty</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{totals.faculty || "—"}</p>
            </div>
          </div>

          {deptError && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Department data unavailable right now: {deptError}
            </div>
          )}

          {deptLoading && !departments ? (
            <div className="space-y-2 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : comparison.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No department performance data yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {comparison.map((d) => (
                <div key={d.code} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="text-slate-200 truncate">
                      <span className="text-slate-500 font-mono text-xs mr-2">#{d.rank}</span>
                      {d.name}
                    </span>
                    <span className="text-slate-400 text-xs shrink-0">
                      {d.totalStudents ?? 0} students · {d.facultyCount ?? 0} faculty
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="presentation">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all motion-reduce:transition-none"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Role Analytics Signal">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Institutional Turnaround & Queue Signals
            </span>
          </div>
          {analytics?.data?.metrics && analytics.data.metrics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {analytics.data.metrics.map((m) => (
                <div key={m.key} className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">{m.label}</p>
                  <p className="text-lg font-bold text-white">
                    {m.value}
                    {m.unit ? <span className="text-xs text-slate-400 ml-1">{m.unit}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No role analytics signals for this period. Full analytics are available to the
              Principal and Administrator desks.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              void refreshAnalytics();
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Loader2 className={`w-3.5 h-3.5 ${!analytics ? "animate-spin" : "hidden"}`} />
            Refresh signals
          </button>
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function VpDepartmentPerformancePage() {
  return (
    <AuthGuard allowedRoles={['vice_principal', 'exam_branch', 'oie', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <VpDepartmentPerformanceInner />
      </Suspense>
    </AuthGuard>
  );
}
