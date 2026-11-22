"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  AlertTriangle,
  FileDown,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useExport } from "@/hooks/useExport";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface RecentScansSummaryPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      entries: number;
      exits: number;
      total: number;
      prevTotal: number;
      delta: number;
    };
    hourly: Array<{ hour: number; entries: number; exits: number }>;
    perGate: Array<{ gate: string; entries: number; exits: number; total: number }>;
  };
}

type PeriodKey = "today" | "this-week" | "last-week";

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "last-week", label: "Last week" },
];

// ── Component ─────────────────────────────────────────────────────────────

export function RecentScansShiftSummary() {
  const { exportCSV } = useExport();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [data, setData] = useState<RecentScansSummaryPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/recent-scans/summary?period=${period}`, {
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
      data.perGate.map((g) => ({ gate: g.gate, entries: g.entries, exits: g.exits, total: g.total })),
      [
        { key: "gate", header: "Gate" },
        { key: "entries", header: "Entries" },
        { key: "exits", header: "Exits" },
        { key: "total", header: "Total" },
      ],
      `shift_summary_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;
  const maxHourly = Math.max(1, ...(data?.hourly.map((h) => h.entries + h.exits) ?? [0]));

  return (
    <WidgetBoundary name="RecentScansShiftSummary" resetKey={period}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-action-primary shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Shift Summary</h2>
              <p className="text-xs text-text-muted">Entries / exits per hour &amp; gate</p>
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
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-24 rounded-xl" />
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
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> Entries
                </div>
                <p className="text-2xl font-bold text-emerald-500 tabular-nums mt-1">{s.entries}</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" /> Exits
                </div>
                <p className="text-2xl font-bold text-rose-500 tabular-nums mt-1">{s.exits}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Total</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-text-primary tabular-nums">{s.total}</span>
                  {s.prevTotal > 0 && <DeltaBadge value={s.total} reference={s.prevTotal} label="" />}
                </div>
              </div>
            </div>

            {/* Hourly bar chart */}
            {data && data.hourly.length > 0 && (
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs font-medium text-text-muted mb-3">By hour</p>
                <div className="flex items-end gap-1 h-28">
                  {data.hourly.map((h) => {
                    const total = h.entries + h.exits;
                    const pct = (total / maxHourly) * 100;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5 min-w-0" title={`${h.hour}:00 — ${h.entries} in, ${h.exits} out`}>
                        <div className="w-full flex flex-col justify-end h-20 rounded-t-sm overflow-hidden bg-bg-surface">
                          <div style={{ height: `${(h.exits / maxHourly) * 100}%` }} className="bg-rose-500/70 w-full" />
                          <div style={{ height: `${(h.entries / maxHourly) * 100}%` }} className="bg-emerald-500/70 w-full" />
                        </div>
                        <span className="text-[9px] text-text-muted tabular-nums">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-500"><span className="size-2 rounded-full bg-emerald-500/70" /> In</span>
                  <span className="inline-flex items-center gap-1 text-rose-500"><span className="size-2 rounded-full bg-rose-500/70" /> Out</span>
                </div>
              </div>
            )}

            {/* Per-gate */}
            {data && data.perGate.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">By gate</p>
                <div className="space-y-1.5">
                  {data.perGate.map((g) => (
                    <div
                      key={g.gate}
                      className="flex items-center justify-between rounded-lg bg-bg-elevated border border-border px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-text-primary">{g.gate}</span>
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className="text-emerald-500">{g.entries} in</span>
                        <span className="text-rose-500">{g.exits} out</span>
                        <span className="font-semibold text-text-primary">{g.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.total === 0 && <EmptyState title="No scans in this period" />}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default RecentScansShiftSummary;
