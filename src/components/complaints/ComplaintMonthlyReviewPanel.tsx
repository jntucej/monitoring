"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface ComplaintReviewPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      total: number;
      resolved: number;
      open: number;
      avgResolutionHours: number;
      lastMonthTotal: number;
      lastMonthResolved: number;
      totalDelta: number;
      resolutionRate: number;
    };
    trend: Array<{ day: string; count: number }>;
    topCategories: Array<{ code: string; count: number }>;
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function ComplaintMonthlyReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<ComplaintReviewPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/complaints/monthly-review?period=${period.key === "all-time" ? "this-month" : period.key}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [period.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      [
        ...data.trend.map((t) => ({ day: t.day, complaints: t.count })),
        { day: "TOTAL", complaints: data.summary.total },
        { day: "RESOLVED", complaints: data.summary.resolved },
        { day: "OPEN", complaints: data.summary.open },
      ],
      [
        { key: "day", header: "Day" },
        { key: "complaints", header: "Count" },
      ],
      `complaints_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;
  const trendMax = Math.max(1, ...(data?.trend.map((t) => t.count ?? 0) ?? [0]));

  return (
    <WidgetBoundary name="ComplaintMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-action-danger shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Complaints Monthly Review</h2>
              <p className="text-xs text-text-muted">Trend, resolution time & top categories</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-surface"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" /> {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Data */}
        {s && !loading && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Complaints</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-text-primary tabular-nums">{s.total}</span>
                  {s.lastMonthTotal > 0 && (
                    <DeltaBadge value={s.total} reference={s.lastMonthTotal} label="" higherIsBetter={false} />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Resolution rate</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums mt-1">{s.resolutionRate}%</p>
                <p className="text-xs text-text-muted">{s.resolved}/{s.total} resolved</p>
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Avg resolution</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-2xl font-bold text-text-primary tabular-nums">{s.avgResolutionHours}h</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Open</p>
                <p className={cn("text-2xl font-bold tabular-nums mt-1", s.open > 0 ? "text-rose-500" : "text-emerald-500")}>
                  {s.open}
                </p>
              </div>
            </div>

            {/* Trend bar chart */}
            {data && data.trend.length > 0 && (
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs font-medium text-text-muted mb-3">Daily trend</p>
                <div className="flex items-end gap-0.5 h-24">
                  {data.trend.map((t) => (
                    <div key={t.day} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-all",
                          t.count === 0 ? "bg-bg-surface" : "bg-rose-500/70"
                        )}
                        style={{ height: `${Math.max(4, (t.count / trendMax) * 80)}px` }}
                        title={`${t.day}: ${t.count}`}
                      />
                      <span className="text-[9px] text-text-muted tabular-nums">{t.day.slice(8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top categories */}
            {data && data.topCategories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Top categories</p>
                <div className="flex flex-wrap gap-2">
                  {data.topCategories.map((c) => (
                    <div
                      key={c.code}
                      className="rounded-lg bg-bg-elevated border border-border px-3 py-2 text-xs flex items-center gap-2"
                    >
                      <span className="font-medium text-text-primary">{c.code}</span>
                      <span className="text-rose-500 font-bold tabular-nums">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {s && s.total === 0 && !loading && (
          <EmptyState title="No complaints in this period" description="A clean month!" />
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ComplaintMonthlyReviewPanel;
