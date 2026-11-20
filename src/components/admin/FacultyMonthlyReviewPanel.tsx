"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown,
  RefreshCw,
  CheckCircle,
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

interface FacultyRow {
  id: string;
  name: string;
  department: string;
  hoursOnCampus: number;
  lateCount: number;
  daysPresent: number;
  nextClass: string | null;
  nextClassTime: string | null;
  disputesCount: number;
}

interface MonthlyPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    faculty: FacultyRow[];
    summary: {
      totalHours: number;
      lastMonthHours: number;
      hoursDelta: number;
      facultyCount: number;
    };
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export function FacultyMonthlyReviewPanel() {
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
        `/api/admin/faculty-tracking/monthly?period=${period.key === "all-time" ? "this-month" : period.key}`,
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
      data.faculty.map((f) => ({
        name: f.name,
        department: f.department,
        hours: f.hoursOnCampus,
        late: f.lateCount,
        days: f.daysPresent,
        disputes: f.disputesCount,
      })),
      [
        { key: "name", header: "Faculty" },
        { key: "department", header: "Department" },
        { key: "hours", header: "Hours on Campus" },
        { key: "late", header: "Late Arrivals" },
        { key: "days", header: "Days Present" },
        { key: "disputes", header: "Open Disputes" },
      ],
      `faculty_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  const s = data?.summary;

  return (
    <WidgetBoundary name="FacultyMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Faculty Monthly Review</h2>
              <p className="text-xs text-text-muted">Hours on campus, disputes, next classes</p>
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
            {/* Summary bar */}
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
                  <p className="text-xs text-text-muted">Faculty</p>
                  <span className="text-xl font-bold text-text-primary tabular-nums">{data.faculty.length}</span>
                </div>
              </div>
              <span className="text-xs text-text-muted">{data.period}</span>
            </div>

            {/* Faculty list */}
            {data.faculty.length === 0 ? (
              <EmptyState title="No faculty data in this period" />
            ) : (
              <div className="space-y-1.5">
                {data.faculty.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-2.5"
                  >
                    {/* Name + dept */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-action-primary/10 text-action-primary shrink-0">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{f.name}</p>
                        <p className="text-xs text-text-muted">{f.department}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-text-primary tabular-nums">{f.hoursOnCampus}h</p>
                        <p className="text-text-muted tabular-nums">{f.daysPresent} days</p>
                      </div>
                      <div className="text-right w-12">
                        <p className={cn("font-semibold tabular-nums", f.lateCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                          {f.lateCount}
                        </p>
                        <p className="text-text-muted">late</p>
                      </div>
                      {f.disputesCount > 0 && (
                        <div className="text-right w-12">
                          <p className="font-semibold text-rose-500 tabular-nums">{f.disputesCount}</p>
                          <p className="text-text-muted">disputes</p>
                        </div>
                      )}
                      {f.nextClass && (
                        <div className="text-right">
                          <p className="text-emerald-500 font-medium">Next: {f.nextClass}</p>
                          {f.nextClassTime && <p className="text-text-muted">{f.nextClassTime}</p>}
                        </div>
                      )}
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

export default FacultyMonthlyReviewPanel;
