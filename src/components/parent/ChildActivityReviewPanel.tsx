"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  AlertTriangle,
  FileDown,
  RefreshCw,
  User,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { RaiseIssueButton } from "@/components/shared/RaiseIssueButton";
import { ScheduleStrip, type ScheduleItem } from "@/components/shared/ScheduleStrip";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

// ── Types ─────────────────────────────────────────────────────────────────

interface ChildActivityPayload {
  data: {
    child: { id: string; name: string };
    period: string;
    range: { from: string; to: string };
    activity: Array<{
      date: string;
      direction: string;
      gate: string;
      timeIn: string | null;
      timeOut: string | null;
    }>;
    timeSpent: {
      hours: number;
      lastMonthHours: number;
      delta: number;
    };
    heatmap: {
      grid: number[][]; // [dayOfWeek(0-6)][hour(0-23)]
      max: number;
    };
    upcoming: Array<{
      date: string;
      gate: string;
      timeIn: string | null;
    }>;
  };
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Component ─────────────────────────────────────────────────────────────

export function ChildActivityReviewPanel({ childId }: { childId: string }) {
  const { period, setPeriod } = usePeriod("this-week");
  const { exportCSV } = useExport();
  const authUser = useAuthStore((s) => s.user);
  const parentId = authUser?.id ?? null;

  const [data, setData] = useState<ChildActivityPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryOpen, setQueryOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/parent/child-activity?childId=${childId}&period=${period.key === "all-time" ? "this-week" : period.key}`,
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
  }, [childId, period.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.activity.map((a) => ({
        date: a.date,
        direction: a.direction,
        gate: a.gate,
        timeIn: a.timeIn ?? "",
        timeOut: a.timeOut ?? "",
      })),
      [
        { key: "date", header: "Date" },
        { key: "direction", header: "Direction" },
        { key: "gate", header: "Gate" },
        { key: "timeIn", header: "Time In" },
        { key: "timeOut", header: "Time Out" },
      ],
      `child_activity_${data.child.name?.replace(/\s/g, "_") ?? "child"}.csv`
    );
  };

  const handleQuerySubmit = async (reason: string, category?: string) => {
    // Route query to warden — uses the complaints API
    await fetch("/api/complaints", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "GUARDIAN_QUERY",
        subject: `Query about ${data?.child.name ?? "child"}`,
        description: category ? `${category}: ${reason}` : reason,
        targetType: "STUDENT",
        targetId: childId,
      }),
    });
    setQueryOpen(false);
  };

  const scheduleItems: ScheduleItem[] = (data?.upcoming ?? []).map((u, i) => ({
    id: `${u.date}-${i}`,
    title: `${u.gate} gate`,
    subtitle: u.timeIn ? u.timeIn : undefined,
    start: `${u.date}T${u.timeIn ?? "08:00:00"}`,
    end: `${u.date}T${u.timeIn ?? "08:00:00"}`,
  }));

  const heatGrid = data?.heatmap.grid ?? [];
  const heatMax = data?.heatmap.max ?? 0;

  return (
    <WidgetBoundary name="ChildActivityReviewPanel" resetKey={`${childId}-${period.key}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-action-success shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {data?.child.name ?? "Child Activity"}
              </h2>
              <p className="text-xs text-text-muted">Period review, heatmap & time on campus</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RaiseIssueButton
              label="Raise query"
              categories={["Late out", "Missing scan", "Wrong gate"]}
              onSubmit={handleQuerySubmit}
              className="text-xs"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
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
            {/* Time spent KPI */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-text-muted">Time on campus</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{data.timeSpent.hours}h</span>
                    {data.timeSpent.lastMonthHours > 0 && (
                      <DeltaBadge
                        value={data.timeSpent.hours}
                        reference={data.timeSpent.lastMonthHours}
                        label="vs last month"
                      />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-muted">{data.period}</span>
            </div>

            {/* Heatmap */}
            {heatGrid.length === 7 && heatMax > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Activity heatmap (day × hour)</p>
                <div className="overflow-x-auto">
                  <div className="grid grid-rows-7 gap-0.5 min-w-[420px]">
                    {heatGrid.map((row, dow) => (
                      <div key={dow} className="flex items-center gap-0.5">
                        <span className="w-8 text-[10px] text-text-muted shrink-0">{DOW_LABELS[dow]}</span>
                        {row.map((count, hr) => (
                          <div
                            key={hr}
                            title={`${DOW_LABELS[dow]} ${hr}:00 — ${count}`}
                            className={cn(
                              "h-3.5 flex-1 rounded-sm",
                              count === 0
                                ? "bg-bg-surface border border-border"
                                : "bg-emerald-500"
                            )}
                            style={
                              count > 0
                                ? { opacity: 0.3 + 0.7 * (count / heatMax) }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1 px-8">
                    <span>12a</span>
                    <span>6a</span>
                    <span>12p</span>
                    <span>6p</span>
                    <span>11p</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming */}
            {scheduleItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Upcoming</p>
                <ScheduleStrip items={scheduleItems} />
              </div>
            )}

            {/* Activity list */}
            {data.activity.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">
                  Recent scans ({data.activity.length})
                </p>
                <div className="space-y-1">
                  {data.activity.slice(0, 8).map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-xs"
                    >
                      <MapPin className={cn("h-3.5 w-3.5 shrink-0", a.direction === "IN" ? "text-emerald-500" : "text-rose-500")} />
                      <span className="font-medium text-text-primary">
                        {a.direction === "IN" ? "Entry" : "Exit"}
                      </span>
                      <span className="text-text-muted">{a.gate}</span>
                      <span className="ml-auto text-text-muted tabular-nums">
                        {a.date}
                        {a.timeIn ? ` ${a.timeIn}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No activity in this period" />
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ChildActivityReviewPanel;
