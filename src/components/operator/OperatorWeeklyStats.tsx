"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileDown,
  RefreshCw,
  Timer,
} from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { DurationBar } from "@/components/shared/DurationBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";
import { ToggleGroup, ToggleButton } from "@/components/ui/toggle";

// ── Types ─────────────────────────────────────────────────────────────────

interface WeeklyPayload {
  data: {
    week: string;
    range: { from: string; to: string };
    hours: number;
    shifts: number;
    lastWeekHours: number;
    lastWeekShifts: number;
    hoursDelta: number;
    daily: Array<{ day: string; hours: number }>;
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function OperatorWeeklyStats() {
  const { exportCSV } = useExport();
  const [week, setWeek] = useState<"this" | "last">("this");
  const [data, setData] = useState<WeeklyPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/stats/weekly?week=${week}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [week]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.daily,
      [
        { key: "day", header: "Date" },
        { key: "hours", header: "Hours" },
      ],
      `operator_weekly_${data.week}.csv`
    );
  };

  // Duration bar: show current week hours vs a 40h reference
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.hours ?? 0) ?? [0]));

  return (
    <WidgetBoundary name="OperatorWeeklyStats" resetKey={week}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-action-primary shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {week === "this" ? "This week" : "Last week"}
              </h2>
              <p className="text-xs text-text-muted">Shift hours & adherence</p>
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

        {/* Week toggle */}
        <ToggleGroup
          value={week}
          onValueChange={(val) => {
            if (val) setWeek(val as "this" | "last");
          }}
          className="p-0.5 gap-0.5"
        >
          {(["this", "last"] as const).map((w) => (
            <ToggleButton
              key={w}
              value={w}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                week === w ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-elevated"
              )}
            >
              {w === "this" ? "This week" : "Last week"}
            </ToggleButton>
          ))}
        </ToggleGroup>

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
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
        {data && !loading && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Hours on shift</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-4 w-4 text-action-primary" />
                  <span className="text-2xl font-bold text-text-primary tabular-nums">{data.hours}</span>
                </div>
                <DeltaBadge value={data.hours} reference={data.lastWeekHours} label="vs LW" />
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Shifts worked</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums mt-1">{data.shifts}</p>
                <DeltaBadge value={data.shifts} reference={data.lastWeekShifts} label="vs LW" />
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Range</p>
                <p className="text-sm font-semibold text-text-primary">{data.range.from}</p>
                <p className="text-xs text-text-muted">{data.range.to}</p>
              </div>
            </div>

            {/* Daily breakdown */}
            {data.daily.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Daily hours</p>
                <div className="space-y-2">
                  {data.daily.map((d) => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-20 shrink-0 tabular-nums">{d.day.slice(5)}</span>
                      <div className="flex-1">
                        <DurationBar
                          elapsedMs={d.hours * 3_600_000}
                          totalMs={maxDaily * 3_600_000}
                          showLabel={false}
                          tone={d.hours > 8 ? "warn" : "info"}
                        />
                      </div>
                      <span className={cn("text-xs font-medium tabular-nums w-10 text-right", d.hours > 10 ? "text-amber-500" : "text-text-primary")}>
                        {d.hours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.daily.length === 0 && (
              <EmptyState title="No shift records this week" description="Hours will appear after your first gate scan." />
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default OperatorWeeklyStats;
