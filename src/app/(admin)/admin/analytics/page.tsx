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
  // Build the window by walking each day in the range through /api/analytics/daily
  // (one call per day — the endpoint is date-scoped). For 7/14/30 d we fan
  // out in parallel and stitch the series.
  const now = new Date();
  const dates: DailyPoint[] = [];
  const dayStr = (d: Date) => d.toISOString().slice(0, 10);

  const fetchOne = async (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const res = await fetch(
      `/api/analytics/daily?date=${dayStr(d)}`,
      { headers: getAuthHeaders() },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const payload = body?.data ?? body;
    return {
      date: dayStr(d),
      entries: Number(payload?.entries ?? 0),
      exits: Number(payload?.exits ?? 0),
      onCampus: Number(payload?.onCampus ?? payload?.on_campus ?? 0),
    } as DailyPoint;
  };

  await Promise.all(
    Array.from({ length: days }, (_, i) =>
      fetchOne(days - 1 - i).then((p) => p && dates.push(p)),
    ),
  );
  // Newest last for the chart.
  dates.sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    entries: dates.reduce((a, b) => a + b.entries, 0),
    exits: dates.reduce((a, b) => a + b.exits, 0),
    peakOnCampus: Math.max(0, ...dates.map((d) => d.onCampus)),
    peakHour: null as string | null,
  };

  return {
    range: {
      from: dates[0]?.date ?? dayStr(now),
      to: dates[dates.length - 1]?.date ?? dayStr(now),
    },
    daily: dates,
    totals,
    byDepartment: [],
    byRole: [],
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
      (data?.byDepartment ?? []).map((d) => ({ code: d.code, count: d.count })),
    [data],
  );

  const exportCsv = () => {
    if (!data) return;
    const header = "date,entries,exits,onCampus\n";
    const rows = data.daily
      .map((d) => `${d.date},${d.entries},${d.exits},${d.onCampus}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Analytics"
        subtitle="Traffic, occupancy, and demographic breakdowns"
        onRefresh={load}
      />

      {error && (
        <div className="glass-card border border-[var(--action-danger)]/30 p-3 text-sm text-[var(--action-danger)]">
          {error}
        </div>
      )}

      {/* Range selector + export */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 glass-card p-1">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`text-xs px-3 py-1 rounded-lg ${
                range === d
                  ? "bg-[var(--action-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-surface)]/60"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--action-primary)]" />
            Total entries
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.entries.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--action-danger)]" />
            Total exits
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.exits.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Users className="w-3.5 h-3.5 text-[var(--action-info)]" />
            Peak on campus
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.peakOnCampus ?? "—"}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Peak hour
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.totals.peakHour ?? "—"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetBoundary title="Traffic">
          <div className="glass-card p-4">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Gate traffic</h2>
              <ChartTypeSwitcher value={trafficType} onChange={setTrafficType} compact />
            </header>
            <div style={{ height: 260 }}>
              <ChartRenderer
                type={trafficType}
                data={trafficData}
                series={trafficSeries}
                xKey="date"
              />
            </div>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Campus occupancy">
          <div className="glass-card p-4">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">On campus over time</h2>
              <ChartTypeSwitcher value={campusType} onChange={setCampusType} compact />
            </header>
            <div style={{ height: 260 }}>
              <ChartRenderer
                type={campusType}
                data={trafficData}
                series={campusSeries}
                xKey="date"
              />
            </div>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="By department">
          <div className="glass-card p-4">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Department breakdown</h2>
            </header>
            <div style={{ height: 260 }}>
              <ChartRenderer
                type="bar"
                data={deptData}
                series={[
                  {
                    key: "count",
                    label: "Users",
                    color: CHART_PALETTE.primary,
                    type: "bar",
                  },
                ]}
                xKey="code"
              />
            </div>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="By role">
          <div className="glass-card p-4">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Role distribution</h2>
              <ChartTypeSwitcher value={roleType} onChange={setRoleType} compact />
            </header>
            <div style={{ height: 260 }}>
              <ChartRenderer
                type={roleType}
                data={data?.byRole ?? []}
                series={roleSeries}
                xKey="role"
              />
            </div>
          </div>
        </WidgetBoundary>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    
      <AdminAnalyticsInner />
    
    

  );
}
