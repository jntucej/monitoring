"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Trophy,
  AlertTriangle,
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

interface AchievementsReviewPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      total: number;
      lastMonthTotal: number;
      delta: number;
    };
    categories: Array<{ category: string; count: number }>;
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function AchievementsReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<AchievementsReviewPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/engagement/achievements/review?period=${period.key === "all-time" ? "this-month" : period.key}`,
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
      data.categories.map((c) => ({
        category: c.category,
        count: c.count,
      })),
      [
        { key: "category", header: "Category" },
        { key: "count", header: "Achievements" },
      ],
      `achievements_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;

  return (
    <WidgetBoundary name="AchievementsReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Achievements Review</h2>
              <p className="text-xs text-text-muted">Monthly earned count & category breakdown</p>
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
            <Skeleton className="h-20 rounded-xl" />
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
            {/* KPI */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Achievements earned</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-text-primary tabular-nums">{s.total}</span>
                    {s.lastMonthTotal > 0 && (
                      <DeltaBadge value={s.total} reference={s.lastMonthTotal} label="vs LM" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-text-muted">{data!.period}</p>
                <p className="text-xs text-text-muted">{data!.range.from} → {data!.range.to}</p>
              </div>
            </div>

            {/* Category breakdown */}
            {data && data.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">By category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.categories.map((c) => (
                    <div
                      key={c.category}
                      className="rounded-lg border border-border bg-bg-elevated px-3 py-2.5"
                    >
                      <p className="text-xs text-text-muted">{c.category}</p>
                      <p className="text-xl font-bold text-text-primary tabular-nums">{c.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.total === 0 && (
              <EmptyState title="No achievements earned this period" description="Keep going — new achievements are earned weekly!" />
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default AchievementsReviewPanel;
