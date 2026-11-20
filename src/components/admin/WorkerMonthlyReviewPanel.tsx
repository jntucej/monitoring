"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HardHat,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  FileDown,
  Loader2,
} from "lucide-react";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EditableField } from "@/components/shared/EditableField";
import { DurationBar } from "@/components/shared/DurationBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface WorkerRow {
  id: string;
  name: string;
  contractor: string;
  totalHours: number;
  overtimeHours: number;
  lateCount: number;
  shiftCount: number;
}

interface ContractorRow {
  contractor: string;
  workers: number;
  totalHours: number;
  lateCount: number;
}

interface MonthlyPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      totalHours: number;
      lateCount: number;
      workerCount: number;
      lastMonthHours: number;
      hoursDelta: number;
      lateDelta: number;
    };
    contractors: ContractorRow[];
    workers: WorkerRow[];
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

function ContractorCard({ c }: { c: ContractorRow }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <p className="text-sm font-semibold text-text-primary">{c.contractor}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-muted">{c.workers} workers</span>
        <div className="text-right">
          <p className="font-medium tabular-nums text-text-primary">{c.totalHours}h</p>
          {c.lateCount > 0 && <p className="text-rose-500">{c.lateCount} late</p>}
        </div>
      </div>
    </div>
  );
}

function WorkerRowView({
  w,
  onEdit,
  isEditing,
}: {
  w: WorkerRow;
  onEdit: (id: string, field: "totalHours" | "lateCount", val: string, reason: string) => Promise<void>;
  isEditing: boolean;
}) {
  const overtimeTone = w.overtimeHours > 0 ? "text-amber-500" : "text-text-muted";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
      {/* Name + contractor */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-action-primary/10 text-action-primary shrink-0">
          <HardHat className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{w.name}</p>
          <p className="text-xs text-text-muted">{w.contractor}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs shrink-0">
        <div className="text-right">
          <p className="font-semibold text-text-primary tabular-nums">{w.totalHours}h</p>
          <p className={cn("tabular-nums", overtimeTone)}>+{w.overtimeHours}h OT</p>
        </div>
        <div className="text-right w-14">
          <p className={cn("font-semibold tabular-nums", w.lateCount > 0 ? "text-rose-500" : "text-emerald-500")}>
            {w.lateCount}
          </p>
          <p className="text-text-muted">late</p>
        </div>
        <div className="text-right w-12">
          <p className="font-semibold text-text-primary tabular-nums">{w.shiftCount}</p>
          <p className="text-text-muted">shifts</p>
        </div>
        {/* Edit button */}
        <button
          type="button"
          onClick={() => onEdit(w.id, "totalHours", String(w.totalHours), "")}
          className="text-text-muted hover:text-action-primary"
          title="Edit hours (with reason)"
        >
          <Clock className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export function WorkerMonthlyReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<MonthlyPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/worker-shifts/monthly?period=${period.key === "all-time" ? "this-month" : period.key}`,
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

  const handleEdit = async (id: string, field: string, val: string, reason: string) => {
    await fetch(`/api/admin/worker-shifts/monthly/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: val, reason }),
    });
    void load();
  };

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.workers.map((w) => ({
        worker: w.name,
        contractor: w.contractor,
        hours: w.totalHours,
        overtime: w.overtimeHours,
        late: w.lateCount,
        shifts: w.shiftCount,
      })),
      [
        { key: "worker", header: "Worker" },
        { key: "contractor", header: "Contractor" },
        { key: "hours", header: "Hours" },
        { key: "overtime", header: "Overtime" },
        { key: "late", header: "Late" },
        { key: "shifts", header: "Shifts" },
      ],
      `worker_shifts_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  return (
    <WidgetBoundary name="WorkerMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <HardHat className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Worker Shifts — Monthly</h2>
              <p className="text-xs text-text-muted">Hours, overtime, late arrivals, contractor roll-up</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
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
        {data && !loading && (
          <>
            {/* Summary KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Total hours</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-text-primary tabular-nums">{data.summary.totalHours}</span>
                  {data.summary.lastMonthHours > 0 && (
                    <DeltaBadge
                      value={data.summary.totalHours}
                      reference={data.summary.lastMonthHours}
                      label="vs LM"
                    />
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Late arrivals</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xl font-bold tabular-nums", data.summary.lateCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                    {data.summary.lateCount}
                  </span>
                  {data.summary.lastMonthHours > 0 && (
                    <DeltaBadge
                      value={data.summary.lateCount}
                      reference={0}
                      label=""
                      higherIsBetter={false}
                    />
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Workers</p>
                <p className="text-xl font-bold text-text-primary tabular-nums mt-1">{data.summary.workerCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted">Period</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{data.period}</p>
                <p className="text-xs text-text-muted">{data.range.from} → {data.range.to}</p>
              </div>
            </div>

            {/* Contractor cards */}
            {data.contractors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">By contractor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.contractors.map((c) => (
                    <ContractorCard key={c.contractor} c={c} />
                  ))}
                </div>
              </div>
            )}

            {/* Worker list */}
            <div>
              <p className="text-xs font-medium text-text-muted mb-2">Workers</p>
              {data.workers.length === 0 ? (
                <EmptyState title="No shift records in this period" />
              ) : (
                <div className="space-y-1.5">
                  {data.workers.map((w) => (
                    <WorkerRowView key={w.id} w={w} onEdit={handleEdit} isEditing={false} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default WorkerMonthlyReviewPanel;
