"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  AlertTriangle,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EditableField } from "@/components/shared/EditableField";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface StaffRow {
  id: string;
  name: string;
  department: string;
  designation: string;
  hoursOnCampus: number;
  lateCount: number;
  daysPresent: number;
  onTimeRate: number;
}

interface MonthlyPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    staff: StaffRow[];
    summary: {
      totalHours: number;
      lastMonthHours: number;
      hoursDelta: number;
      staffCount: number;
    };
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function StaffMonthlyReviewPanel() {
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
        `/api/admin/staff-tracking/monthly?period=${period.key === "all-time" ? "this-month" : period.key}`,
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
      data.staff.map((s) => ({
        name: s.name,
        department: s.department,
        designation: s.designation,
        hours: s.hoursOnCampus,
        late: s.lateCount,
        days: s.daysPresent,
        onTimeRate: s.onTimeRate,
      })),
      [
        { key: "name", header: "Staff" },
        { key: "department", header: "Department" },
        { key: "designation", header: "Designation" },
        { key: "hours", header: "Hours" },
        { key: "late", header: "Late" },
        { key: "days", header: "Days" },
        { key: "onTimeRate", header: "On-time %" },
      ],
      `staff_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;

  return (
    <WidgetBoundary name="StaffMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-action-warning/10 text-action-warning">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Staff Monthly Review</h2>
              <p className="text-xs text-text-muted">Shift adherence, late arrivals, hours on campus</p>
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
            {/* Summary */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-text-muted">Total hours</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-text-primary tabular-nums">{s?.totalHours}</span>
                    {s && s.lastMonthHours > 0 && (
                      <DeltaBadge value={s.totalHours} reference={s.lastMonthHours} label="vs LM" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Staff</p>
                  <span className="text-xl font-bold text-text-primary tabular-nums">{data.staff.length}</span>
                </div>
              </div>
              <span className="text-xs text-text-muted">{data.period}</span>
            </div>

            {/* Staff list */}
            {data.staff.length === 0 ? (
              <EmptyState title="No staff records in this period" />
            ) : (
              <div className="space-y-1.5">
                {data.staff.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-action-warning/10 text-action-warning shrink-0">
                        <Briefcase className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{st.name}</p>
                        <p className="text-xs text-text-muted">
                          {st.department} · {st.designation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-text-primary tabular-nums">{st.hoursOnCampus}h</p>
                        <p className="text-text-muted tabular-nums">{st.daysPresent} days</p>
                      </div>
                      <div className="text-right w-14">
                        <p className={cn("font-semibold tabular-nums", st.onTimeRate >= 90 ? "text-emerald-500" : st.onTimeRate >= 70 ? "text-amber-500" : "text-rose-500")}>
                          {st.onTimeRate}%
                        </p>
                        <p className="text-text-muted">on-time</p>
                      </div>
                      <div className="text-right w-10">
                        <p className={cn("font-semibold tabular-nums", st.lateCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                          {st.lateCount}
                        </p>
                        <p className="text-text-muted">late</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default StaffMonthlyReviewPanel;
