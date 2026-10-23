"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, TrendingUp, Users, AlertTriangle, Download, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import {
  ChartRenderer, type ChartType, type SeriesDef,
} from "@/components/admin/shared/ChartRenderer";
import { ChartTypeSwitcher } from "@/components/admin/shared/ChartTypeSwitcher";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

/**
 * Admin Analytics — re-skin of the inline Card+BarChart/PieChart layout.
 *
 * Uses the `ChartRenderer + ChartTypeSwitcher` chrome (shared kit) over the
 * live `/api/analytics/daily` feed. Range toggle (7 / 14 / 30 d) drives the
 * window; totals + KPIs are derived client-side so the page renders even
 * when a day has no scans. CSV export of the daily series.
 */

interface DailyPoint {
  date: string;
  entries: number;
  exits: number;
  onCampus: number;
}

interface AnalyticsData {
  range: { from: string; to: string };
  daily: DailyPoint[];
  totals: {
    entries: number;
    exits: number;
    peakOnCampus: number;
    peakHour: string | null;
  };
  byDepartment: Array<{ code: string; name: string; count: number }>;
  byRole: Array<{ role: string; count: number }>;
}

const CHART_PALETTE = {
  primary: "#10b981",
  info: "#3b82f6",
  warning: "#f59e0b",
  danger: "#ef4444",
  violet: "#8b5cf6",
};

async function fetchAnalytics(days = 14): Promise<AnalyticsData> {
  const now = new Date();
  const dayStr = (d: Date) => d.toISOString().slice(0, 10);
  const headers = getAuthHeaders();
  // 1. Daily traffic points (parallel)
  const dailyFetch = Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const res = await fetch(`/api/analytics/daily?date=${dayStr(d)}`, { headers });
      if (!res.ok) return null;
      const body = await res.json();
      const payload = body?.data ?? body;
      return {
        date: dayStr(d),
        entries: Number(payload?.entries ?? 0),
        exits: Number(payload?.exits ?? 0),
        onCampus: Number(payload?.onCampus ?? payload?.on_campus ?? 0),
      } as DailyPoint;
    })
  );
  // 2. Reference data for charts (parallel)
  const refFetch = Promise.all([
    fetch("/api/departments", { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("/api/students",    { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("/api/users",       { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const [dailyRows, [deptJson, stuJson, userJson]] = await Promise.all([dailyFetch, refFetch]);
  const dates = dailyRows.filter((p): p is DailyPoint => p !== null).sort((a, b) => a.date.localeCompare(b.date));
  const totals = {
    entries: dates.reduce((a, b) => a + b.entries, 0),
    exits: dates.reduce((a, b) => a + b.exits, 0),
    peakOnCampus: Math.max(0, ...dates.map((d) => d.onCampus)),
    peakHour: null as string | null,
  };
  // 3. byDepartment — count students per department code
  const depts: Array<{ id?: string; code?: string; name?: string }> =
    Array.isArray(deptJson?.data) ? deptJson.data : [];
  const students: Array<Record<string, unknown>> =
    Array.isArray(stuJson?.data) ? stuJson.data : [];
  const studentCountByDept = new Map<string, number>();
  for (const s of students) {
    const raw = (s.department ?? s.departmentId ?? s.department_id ?? "") as string;
    const key = String(raw || "unassigned");
    studentCountByDept.set(key, (studentCountByDept.get(key) ?? 0) + 1);
  }
  const byDepartment = depts
    .map((d) => {
      const code = String(d.code ?? d.id ?? d.name ?? "");
      return { code, name: String(d.name ?? code), count: studentCountByDept.get(code) ?? 0 };
    })
    .filter((d) => d.code)
    .sort((a, b) => b.count - a.count);
  // 4. byRole — count active users per role
  const users: Array<Record<string, unknown>> =
    Array.isArray(userJson?.data) ? userJson.data : [];
  const roleCounts = new Map<string, number>();
  for (const u of users) {
    if (u.status && String(u.status) !== "ACTIVE") continue;
    const role = String(u.role ?? "");
    if (!role) continue;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const byRole = [...roleCounts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);
  return {
    range: {
      from: dates[0]?.date ?? dayStr(now),
      to: dates[dates.length - 1]?.date ?? dayStr(now),
    },
    daily: dates,
    totals,
    byDepartment,
    byRole,
  };
}

function AdminAnalyticsInner() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [trafficType, setTrafficType] = useState<ChartType>("area");
  const [campusType, setCampusType] = useState<ChartType>("line");
  const [roleType, setRoleType] = useState<ChartType>("bar");

  const load = useCallback(async () => {
    try {
      setData(await fetchAnalytics(range));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
  }, [range]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  const trafficSeries: SeriesDef[] = [
    { key: "entries", label: "Entries", color: CHART_PALETTE.primary, type: "area" },
    { key: "exits", label: "Exits", color: CHART_PALETTE.danger, type: "area" },
  ];
  const campusSeries: SeriesDef[] = [
    { key: "onCampus", label: "On campus", color: CHART_PALETTE.info, type: "line" },
  ];
  const roleSeries: SeriesDef[] = [
    { key: "count", label: "Users", color: CHART_PALETTE.violet, type: "bar" },
  ];

  const trafficData = useMemo(
    () =>
      (data?.daily ?? []).map((d) => ({
        date: d.date.slice(5),
        entries: d.entries,
        exits: d.exits,
        onCampus: d.onCampus,
      })),
    [data],
  );

  const deptData = useMemo(
    () =>
      (data?.byDepartment ?? []).map((d) => ({
        name: d.name,
        count: d.count,
      })),
    [data],
  );

  const roleData = useMemo(
    () =>
      (data?.byRole ?? []).map((r) => ({
        role: r.role,
        count: r.count,
      })),
    [data],
  );

  const exportCsv = () => {
    if (!data || data.daily.length === 0) return;
    const header = "Date,Entries,Exits,OnCampus\n";
    const rows = data.daily.map((d) => `${d.date},${d.entries},${d.exits},${d.onCampus}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${data.range.from}-to-${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Campus Analytics"
        subtitle={`Traffic and occupancy from ${data?.range.from ?? "—"} to ${data?.range.to ?? "—"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-1 text-xs">
            {(([7, 14, 30] as const)).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  range === days
                    ? "bg-[var(--action-primary)] text-white shadow"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || data.daily.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetBoundary title="Total Entries">
          <div className="glass-card p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Total Entries ({range}d)
            </p>
            {data ? (
              <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {data.totals.entries.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Total Exits">
          <div className="glass-card p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" /> Total Exits ({range}d)
            </p>
            {data ? (
              <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {data.totals.exits.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Peak On-Campus">
          <div className="glass-card p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Peak On-Campus
            </p>
            {data ? (
              <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {data.totals.peakOnCampus.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Average Daily Volume">
          <div className="glass-card p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" /> Daily Avg Volume
            </p>
            {data ? (
              <p className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
                {Math.round((data.totals.entries + data.totals.exits) / Math.max(1, data.daily.length)).toLocaleString()}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </div>
        </WidgetBoundary>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetBoundary title="Traffic Volume">
          <div className="glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Gate Traffic Flow</h3>
                <p className="text-xs text-[var(--text-muted)]">Entries versus exits over time</p>
              </div>
              <ChartTypeSwitcher current={trafficType} onChange={setTrafficType} />
            </div>
            {data ? (
              <ChartRenderer
                type={trafficType}
                data={trafficData}
                series={trafficSeries}
                xAxisKey="date"
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Campus Occupancy">
          <div className="glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">On-Campus Occupancy</h3>
                <p className="text-xs text-[var(--text-muted)]">Net population count present on grounds</p>
              </div>
              <ChartTypeSwitcher current={campusType} onChange={setCampusType} />
            </div>
            {data ? (
              <ChartRenderer
                type={campusType}
                data={trafficData}
                series={campusSeries}
                xAxisKey="date"
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Department Distribution">
          <div className="glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Students by Department</h3>
                <p className="text-xs text-[var(--text-muted)]">Active departmental headcounts</p>
              </div>
              <ChartTypeSwitcher current={roleType} onChange={setRoleType} />
            </div>
            {data ? (
              <ChartRenderer
                type={roleType}
                data={deptData}
                series={[{ key: "count", label: "Students", color: CHART_PALETTE.primary, type: roleType }]}
                xAxisKey="name"
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Role Distribution">
          <div className="glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Users by Role</h3>
                <p className="text-xs text-[var(--text-muted)]">Breakdown of operational accounts</p>
              </div>
              <ChartTypeSwitcher current={roleType} onChange={setRoleType} />
            </div>
            {data ? (
              <ChartRenderer
                type={roleType}
                data={roleData}
                series={roleSeries}
                xAxisKey="role"
                height={280}
              />
            ) : (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            )}
          </div>
        </WidgetBoundary>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminAnalyticsInner />
    </Suspense>
  );
}
