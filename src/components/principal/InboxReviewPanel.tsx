"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  CheckCircle,
  XCircle,
  Forward,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
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

interface ReviewPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      total: number;
      approved: number;
      rejected: number;
      forwarded: number;
      approvalRate: number;
      avgResolutionHours: number;
      lastMonthTotal: number;
      lastMonthApprovalRate: number | null;
      totalDelta: number;
      approvalRateDelta: number | null;
    };
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function PrincipalInboxReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<ReviewPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/principal/inbox/review?period=${period.key === "all-time" ? "this-month" : period.key}`,
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
    const s = data.summary;
    exportCSV(
      [
        { metric: "Total decisions", value: s.total },
        { metric: "Approved", value: s.approved },
        { metric: "Rejected", value: s.rejected },
        { metric: "Forwarded", value: s.forwarded },
        { metric: "Approval rate (%)", value: s.approvalRate },
        { metric: "Avg resolution (hours)", value: s.avgResolutionHours },
        { metric: "Last month total", value: s.lastMonthTotal },
        { metric: "Last month approval rate (%)", value: s.lastMonthApprovalRate ?? "n/a" },
      ],
      [
        { key: "metric", header: "Metric" },
        { key: "value", header: "Value" },
      ],
      `principal_decisions_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;

  return (
    <WidgetBoundary name="PrincipalInboxReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Decision Review</h2>
              <p className="text-xs text-text-muted">Monthly decision stats & last-month compare</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-xs text-text-muted">Decisions</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-bold text-text-primary tabular-nums">{s.total}</span>
                {s.lastMonthTotal > 0 && (
                  <DeltaBadge
                    value={s.total}
                    reference={s.lastMonthTotal}
                    label="vs LM"
                  />
                )}
              </div>
            </div>

            {/* Approval rate */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-xs text-text-muted">Approval rate</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-bold text-text-primary tabular-nums">{s.approvalRate}%</span>
                {s.lastMonthApprovalRate !== null && (
                  <DeltaBadge
                    value={s.approvalRate}
                    reference={s.lastMonthApprovalRate}
                    label="vs LM"
                  />
                )}
              </div>
            </div>

            {/* Avg resolution */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-xs text-text-muted">Avg resolution</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-2xl font-bold text-text-primary tabular-nums">{s.avgResolutionHours}h</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-xs text-text-muted">Breakdown</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5 text-emerald-500">
                  <CheckCircle className="h-3 w-3" />{s.approved}
                </span>
                <span className="flex items-center gap-0.5 text-rose-500">
                  <XCircle className="h-3 w-3" />{s.rejected}
                </span>
                <span className="flex items-center gap-0.5 text-amber-500">
                  <Forward className="h-3 w-3" />{s.forwarded}
                </span>
              </div>
            </div>
          </div>
        )}

        {s && s.total === 0 && !loading && (
          <EmptyState title="No decisions in this period" description="Decisions will appear once tickets are processed." />
        )}
      </div>
    </WidgetBoundary>
  );
}

export default PrincipalInboxReviewPanel;
