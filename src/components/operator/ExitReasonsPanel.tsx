"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DoorOpen,
  FileDown,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { MiniSparkline } from "@/components/shared/MiniSparkline";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface ExitReasonPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    total: number;
    prevTotal: number;
    delta: number;
    byReason: Array<{ reason: string; count: number; pct: number }>;
    byGate: Array<{ gate: string; reason: string; count: number }>;
  };
}

type PeriodKey = "today" | "this-week" | "last-week" | "this-month" | "last-month";

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "last-week", label: "Last week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
];

// ── Component ─────────────────────────────────────────────────────────────

export function ExitReasonsPanel() {
  const { exportCSV } = useExport();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [data, setData] = useState<ExitReasonPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/stats/exit-reasons?period=${period}`, {
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
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.byReason.map((r) => ({
        reason: r.reason,
        count: r.count,
        pct: `${r.pct}%`,
      })),
      [
        { key: "reason", header: "Reason" },
        { key: "count", header: "Exits" },
        { key: "pct", header: "Share" },
      ],
      `exit_reasons_${data.period}.csv`
    );
  };

  const maxPct = Math.max(1, ...(data?.byReason.map((r) => r.pct) ?? [0]));

  return (
    <WidgetBoundary name="ExitReasonsPanel" resetKey={period}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-action-danger shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Exit Reasons</h2>
              <p className="text-xs text-text-muted">Per-reason exit breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!data || data.total === 0}
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

        {/* Period toggle */}
        <div className="surface-card inline-flex rounded-lg p-0.5 gap-0.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                period === key ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-elevated"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
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
        {data && !loading && (
          <>
            {/* KPI */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Total exits</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{data.total}</span>
                    {data.prevTotal > 0 && <DeltaBadge value={data.total} reference={data.prevTotal} label="" />}
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  {data.range.from} → {data.range.to}
                </p>
              </div>
            </div>

            {/* Per-reason bars */}
            {data.byReason.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted">Reason breakdown</p>
                {data.byReason.map((r) => (
                  <div key={r.reason} className="rounded-lg bg-bg-elevated border border-border px-3 py-2">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-text-primary">{r.reason}</span>
                      <span className="text-text-muted tabular-nums">{r.count} · {r.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                      <div
                        style={{ width: `${(r.pct / maxPct) * 100}%` }}
                        className="h-full rounded-full bg-rose-500/70"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No exits in this period.</p>
            )}

            {/* Per-gate */}
            {data.byGate.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">By gate</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.byGate.slice(0, 8).map((g, i) => (
                    <div key={i} className="rounded-lg bg-bg-elevated border border-border px-3 py-2 text-xs">
                      <p className="font-medium text-text-primary truncate">{g.gate}</p>
                      <p className="text-text-muted mt-0.5">{g.reason}: {g.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ExitReasonsPanel;
