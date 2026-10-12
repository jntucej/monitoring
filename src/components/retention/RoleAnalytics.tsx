"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  Filter,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ChartRenderer, CHART_PALETTE, type ChartType } from "@/components/shared/ChartRenderer";
import { getRoleAnalytics, type AnalyticsMetric } from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function RoleAnalytics() {
  const { user, role } = useAuthStore();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [seriesData, setSeriesData] = useState<Record<string, string | number>[]>([]);
  const [chartRole, setChartRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Filter state
  const [dateRange, setDateRange] = useState<"7d" | "30d">("7d");
  const [department, setDepartment] = useState("");
  const [gate, setGate] = useState("");

  const isManager = ["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal"].includes(
    role ?? ""
  );
  const isOperator = ["operator", "caretaker"].includes(role ?? "");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getRoleAnalytics(dateRange, department || undefined, undefined, gate || undefined);
      if (result.success) {
        setMetrics(result.data.metrics);
        setSeriesData(result.data.seriesData);
        setChartRole(result.data.role);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, department, gate]);

  useEffect(() => {
    load();
  }, [load]);

  // Derive chart config from role
  const chartConfig = useMemo(() => {
    const role = chartRole;

    if (["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal"].includes(role)) {
      return {
        type: "line" as ChartType,
        title: "Approval Throughput",
        xKey: "date",
        series: [
          { key: "pending", label: "Pending", color: CHART_PALETTE[1] },
          { key: "resolved", label: "Resolved", color: CHART_PALETTE[0] },
        ],
      };
    }

    if (["operator", "caretaker"].includes(role)) {
      return {
        type: "area" as ChartType,
        title: "Scan Volume & Failures",
        xKey: "date",
        series: [
          { key: "scans", label: "Scans", color: CHART_PALETTE[0] },
          { key: "failed", label: "Failed", color: CHART_PALETTE[3] },
        ],
      };
    }

    // Manager
    return {
      type: "bar" as ChartType,
      title: "Alerts & Resolution",
      xKey: "date",
      series: [
        { key: "alerts", label: "New Alerts", color: CHART_PALETTE[1] },
        { key: "resolved", label: "Resolved", color: CHART_PALETTE[0] },
      ],
    };
  }, [chartRole]);

  // Determine which filters to show
  const showDeptFilter = isManager || isOperator;
  const showGateFilter = isOperator || isManager;

  return (
    <WidgetBoundary title="Role Analytics">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-100">Role Analytics</h3>
            <span className="text-xs text-slate-500 capitalize">{chartRole}</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-900/40 px-2 py-1">
              <Filter className="h-3 w-3 text-slate-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as "7d" | "30d")}
                className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                aria-label="Date range"
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>

            {showDeptFilter && (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-lg border border-slate-600/50 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                aria-label="Department"
              >
                <option value="">All depts</option>
                {["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {showGateFilter && (
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="rounded-lg border border-slate-600/50 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                aria-label="Gate"
              >
                <option value="">All gates</option>
                {["main", "north", "south", "east", "west"].map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-700/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {metrics.map((m) => (
              <div
                key={m.key}
                className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3"
              >
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  {m.key === "active_alerts" && <AlertTriangle className="h-3 w-3" />}
                  {m.key.includes("turnaround") || m.key.includes("resolution") ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {m.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {m.value}
                  {m.unit && <span className="text-xs text-slate-400 ml-1">{m.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {seriesData.length > 0 ? (
          <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3">
            <p className="text-[10px] text-slate-500 mb-2">{chartConfig.title}</p>
            <ChartRenderer
              type={chartConfig.type}
              data={seriesData}
              series={chartConfig.series}
              xKey={chartConfig.xKey}
              height={220}
            />
          </div>
        ) : (
          !loading && (
            <p className="text-xs text-slate-500 py-6 text-center">
              No data available for the selected filters.
            </p>
          )
        )}
      </div>
    </WidgetBoundary>
  );
}

export default RoleAnalytics;
