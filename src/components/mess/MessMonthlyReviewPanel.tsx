"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UtensilsCrossed,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Star,
  AlertTriangle,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface PerMeal {
  meal: string;
  avg: number;
  count: number;
  complaints: number;
  lastMonthAvg: number | null;
  delta: number | null;
}

interface AggregatePayload {
  data: {
    period: string;
    range: { from: string; to: string };
    perMeal: PerMeal[];
    overall: { avg: number; total: number };
  };
}

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

function StarScale({ avg, className }: { avg: number; className?: string }) {
  const rounded = Math.round(avg);
  return (
    <div className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= rounded ? "fill-amber-400 text-amber-400" : "text-text-muted/20"
          )}
        />
      ))}
    </div>
  );
}

function MealRow({ meal }: { meal: PerMeal }) {
  const trendIcon =
    meal.delta == null ? <Minus className="h-3.5 w-3.5 text-text-muted" />
    : meal.delta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    : meal.delta < 0 ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
    : <Minus className="h-3.5 w-3.5 text-text-muted" />;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
      {/* Left: meal name + stars */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-text-primary w-20 shrink-0">
          {MEAL_LABEL[meal.meal] ?? meal.meal}
        </span>
        <StarScale avg={meal.avg} />
        <span className="text-lg font-bold text-text-primary tabular-nums">
          {meal.avg.toFixed(1)}
        </span>
      </div>

      {/* Right: count, complaints, delta */}
      <div className="flex items-center gap-4 text-xs shrink-0">
        <div className="text-right">
          <p className="text-text-muted">{meal.count} reviews</p>
          {meal.complaints > 0 && (
            <p className="text-rose-500">{meal.complaints} complaints</p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 font-medium tabular-nums",
            meal.delta == null
              ? "text-text-muted bg-bg-surface"
              : meal.delta > 0
                ? "text-emerald-500 bg-emerald-500/10"
                : meal.delta < 0
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-text-muted bg-bg-surface"
          )}
        >
          {trendIcon}
          {meal.delta == null ? "—" : `${meal.delta > 0 ? "+" : ""}${meal.delta.toFixed(1)}`}
          <span className="text-text-muted font-normal">vs LM</span>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export function MessMonthlyReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<AggregatePayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mess/reviews/aggregate?period=${period.key === "all-time" ? "all-time" : period.key}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) {
        throw new Error(body?.message ?? "Failed to load");
      }
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
      data.perMeal.map((m) => ({
        meal: m.meal,
        avg: m.avg,
        reviews: m.count,
        complaints: m.complaints,
        lastMonth: m.lastMonthAvg ?? "n/a",
        delta: m.delta ?? "n/a",
      })),
      [
        { key: "meal", header: "Meal" },
        { key: "avg", header: "Avg Rating" },
        { key: "reviews", header: "Reviews" },
        { key: "complaints", header: "Complaints" },
        { key: "lastMonth", header: "Last Month Avg" },
        { key: "delta", header: "Delta" },
      ],
      `mess_review_${data.period}.csv`
    );
  };

  return (
    <WidgetBoundary name="MessMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Meal Reviews</h2>
              <p className="text-xs text-text-muted">Monthly aggregate & last-month compare</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              Export
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

        {/* Period picker */}
        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {/* Data */}
        {data && !loading && (
          <>
            {/* Overall scorecard */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-4">
              <div>
                <p className="text-xs font-medium text-text-muted">Overall rating (all time)</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-text-primary tabular-nums">
                    {data.overall.avg.toFixed(1)}
                  </span>
                  <StarScale avg={data.overall.avg} />
                </div>
                <p className="text-xs text-text-muted mt-1">{data.overall.total} total reviews</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-text-muted">Period</p>
                <p className="text-lg font-semibold text-text-primary">{data.period}</p>
                <p className="text-xs text-text-muted">{data.range.from} → {data.range.to}</p>
              </div>
            </div>

            {/* Per-meal rows */}
            <div className="space-y-2">
              {data.perMeal.map((m) => (
                <MealRow key={m.meal} meal={m} />
              ))}
            </div>

            {/* No data */}
            {data.perMeal.every((m) => m.count === 0) && (
              <EmptyState
                title="No reviews in this period"
                description="Reviews will appear once students submit ratings for meals."
              />
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default MessMonthlyReviewPanel;
