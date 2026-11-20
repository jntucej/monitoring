"use client";

import { useCallback, useEffect, useState } from "react";
import {
  History,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Clock,
  FileDown,
  RefreshCw,
  AlertTriangle,
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

interface DecisionHistoryPayload {
  data: {
    period: string;
    limit: number;
    count: number;
    decisions: Array<{
      ticket: string;
      type: string;
      status: string;
      action: string;
      comment: string | null;
      decidedAt: string;
    }>;
    totals: { approved: number; rejected: number; escalated: number };
  };
}

const STATUS_ICON: Record<string, { Icon: typeof CheckCircle; cls: string }> = {
  APPROVED: { Icon: CheckCircle, cls: "text-emerald-500" },
  REJECTED: { Icon: XCircle, cls: "text-rose-500" },
  ESCALATED: { Icon: ArrowUpRight, cls: "text-amber-500" },
  COMPLETED: { Icon: CheckCircle, cls: "text-emerald-500" },
};

// ── Component ─────────────────────────────────────────────────────────────

export function DecisionHistoryPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<DecisionHistoryPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/approver/decision-history?period=${period.key === "all-time" ? "all" : period.key}`,
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
      data.decisions.map((d) => ({
        ticket: d.ticket,
        type: d.type,
        status: d.status,
        comment: d.comment ?? "",
        decidedAt: d.decidedAt,
      })),
      [
        { key: "ticket", header: "Ticket" },
        { key: "type", header: "Type" },
        { key: "status", header: "Decision" },
        { key: "comment", header: "Comment" },
        { key: "decidedAt", header: "Decided At" },
      ],
      `decisions_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const t = data?.totals;

  return (
    <WidgetBoundary name="DecisionHistoryPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Decision History</h2>
              <p className="text-xs text-text-muted">Your recent decisions & monthly aggregate</p>
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
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-xl" />
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
        {t && !loading && (
          <>
            {/* Monthly aggregate */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-text-muted">Approved</p>
                <p className="text-2xl font-bold text-emerald-500 tabular-nums">{t.approved}</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="text-xs text-text-muted">Rejected</p>
                <p className="text-2xl font-bold text-rose-500 tabular-nums">{t.rejected}</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs text-text-muted">Escalated</p>
                <p className="text-2xl font-bold text-amber-500 tabular-nums">{t.escalated}</p>
              </div>
            </div>

            {/* Decision list */}
            {data && data.decisions.length > 0 ? (
              <div className="space-y-1.5">
                {data.decisions.map((d, i) => {
                  const meta = STATUS_ICON[d.status] ?? STATUS_ICON.COMPLETED;
                  const { Icon, cls } = meta;
                  return (
                    <div
                      key={`${d.ticket}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5"
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", cls)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{d.type}</p>
                        {d.comment && (
                          <p className="text-xs text-text-muted truncate">{d.comment}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-semibold uppercase", cls)}>{d.status}</p>
                        <p className="text-[10px] text-text-muted tabular-nums">{d.decidedAt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No decisions in this period" description="Your recent decisions will appear here." />
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default DecisionHistoryPanel;
