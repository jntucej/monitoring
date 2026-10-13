"use client";

import { Suspense, useCallback, useMemo } from "react";
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
  Clock,
  Loader2,
  ChartBar,
  AlertTriangle,
  ArrowRight,
  FileBarChart,
  Users,
} from "lucide-react";

/* /api/campus-extra/analytics response shape */
interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: AnalyticsMetric[];
    seriesData: Array<Record<string, string | number>>;
    role: string;
  };
}

/* /api/occupancy/presence-matrix response shape */
interface PresenceResponse {
  success: boolean;
  data: {
    gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated: string;
  };
}

function ExamBranchReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics,
  } = useApiResource<AnalyticsResponse>("/api/campus-extra/analytics", {
    ttlMs: 30_000,
  });

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshAnalytics(), refreshPresence()]);
  }, [refreshAnalytics, refreshPresence]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy =
    (analyticsLoading && !analytics) || (presenceLoading && !presence);

  const metrics = analytics?.data?.metrics ?? [];
  const series = analytics?.data?.seriesData ?? [];
  const gates = presence?.data?.gates ?? [];
  const matrix = presence?.data?.matrix ?? {};

  const totalOnCampus = useMemo(() => {
    return Object.values(matrix).reduce(
      (sum, gateCounts) => sum + Object.values(gateCounts).reduce((a, b) => a + b, 0),
      0
    );
  }, [matrix]);

  const metricsForbidden =
    typeof analyticsError === "string" &&
    (analyticsError.includes("403") || analyticsError.includes("FORBIDDEN"));

  /*
   * exam_branch is not included in APPROVER_ROLES / OPERATOR_ROLES / MANAGER_ROLES
   * in /api/campus-extra/analytics, so it falls back to the generic "role" metric
   * with value 0. That's fine — the presence matrix is the primary report source
   * for exam_branch, and the metrics section is best-effort / informational.
   */
  const hasMeaningfulMetrics =
    metrics.length > 0 && !(metrics.length === 1 && metrics[0].key === "role");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {presenceError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Reports data unavailable: {presenceError}</span>
          </span>
          <button
            type="button"
            onClick={() => void refreshPresence()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top KPI cards */}
      <WidgetBoundary title="Examination-Day Reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <Users className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                On Campus Now
              </span>
            </div>
            {presenceLoading && !presence ? (
              <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400">{totalOnCampus}</p>
            )}
            <p className="text-xs text-slate-500">All roles inside active gates</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <ChartBar className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Active Gates
              </span>
            </div>
            {presenceLoading && !presence ? (
              <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
            ) : (
              <p className="text-2xl font-bold text-sky-400">{gates.length}</p>
            )}
            <p className="text-xs text-slate-500">Gates reporting in real-time</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <FileBarChart className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Analytics
              </span>
            </div>
            {analyticsLoading && !analytics ? (
              <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
            ) : hasMeaningfulMetrics ? (
              <p className="text-2xl font-bold text-amber-400">{metrics.length} metrics</p>
            ) : (
              <p className="text-2xl font-bold text-slate-500">N/A</p>
            )}
            <p className="text-xs text-slate-500">
              {hasMeaningfulMetrics
                ? "Approval and turnaround analytics"
                : "Analytics not available for this role"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Last Updated
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {presence?.data?.lastUpdated
                ? new Date(presence.data.lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
            <p className="text-xs text-slate-500">Auto-refreshes every 30 seconds</p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Gate × role matrix */}
      <WidgetBoundary title="Gate Occupancy Matrix">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ChartBar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Gate × Role Occupancy
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {gates.length} gates · live
            </span>
          </div>

          {presenceLoading && !presence ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : gates.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <ChartBar className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No active gates reporting.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-4 py-2.5 font-semibold">Gate</th>
                    {presence?.data?.roles?.map((roleKey) => (
                      <th key={roleKey} className="text-right px-3 py-2.5 font-semibold">
                        {roleKey}
                      </th>
                    ))}
                    <th className="text-right px-4 py-2.5 font-semibold text-emerald-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gates.map((gate) => {
                    const counts = matrix[gate.id] ?? {};
                    const total = Object.values(counts).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={gate.id} className="border-b border-slate-800/40 last:border-b-0">
                        <td className="px-4 py-2.5 text-slate-300 font-medium">
                          {gate.name}
                          <span className="ml-1.5 text-slate-600">{gate.code}</span>
                        </td>
                        {presence?.data?.roles?.map((roleKey) => (
                          <td
                            key={roleKey}
                            className={`px-3 py-2.5 text-right tabular-nums ${
                              (counts[roleKey] ?? 0) > 0
                                ? "text-white"
                                : "text-slate-700"
                            }`}
                          >
                            {counts[roleKey] ?? 0}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400 font-semibold">
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Analytics metrics (if available for this role) */}
      {hasMeaningfulMetrics && !metricsForbidden && (
        <WidgetBoundary title="Role Analytics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
            {metrics.map((m) => (
              <div key={m.key} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{m.label}</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {m.value}
                  {m.unit && <span className="text-sm text-slate-500 ml-1">{m.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </WidgetBoundary>
      )}

      {/* Series data (daily breakdown) */}
      {series.length > 0 && (
        <WidgetBoundary title="Daily Series">
          <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    {Object.keys(series[0]).map((k) => (
                      <th key={k} className="text-left px-4 py-2 font-semibold">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.slice(0, 14).map((row, i) => (
                    <tr key={i} className="border-b border-slate-800/40 last:border-b-0">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2 text-slate-300 tabular-nums">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetBoundary>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchReportsInner />
    </Suspense>
  );
}
