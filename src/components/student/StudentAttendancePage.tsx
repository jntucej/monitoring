/**
 * Student Attendance — full flexibility-pillar reference implementation.
 *
 * Pillars:
 *  1. See      — period picker (today / week / last week / month / last month / all)
 *  2. Edit     — "mark present" request (via useDispute → /api/student/attendance/dispute)
 *  3. Dispute  — raise a dispute on a specific day (same endpoint)
 *  4. Review   — (future: rate attendance system)
 *  5. Compare  — this period vs last period, DeltaBadge
 *  6. Export   — CSV of daily records for the selected period
 *  7. Remind   — next class strip (today's classes from class_periods)
 *  8. Schedule — 30-day heatmap
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileDown,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Loader2,
  Pencil,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  XCircle,
  BookOpen,
  Search,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { MiniSparkline } from "@/components/shared/MiniSparkline";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/stores/uiStore";
import { PERIOD_OPTIONS } from "@/lib/period";
import type { PeriodKey } from "@/lib/period";
import { AttendanceNextPeriodRadar } from "@/components/student/AttendanceNextPeriodRadar";
import { ErrorRecoveryBanner } from "@/components/shared/ErrorRecoveryBanner";
import {
  useEntityInspector,
  EntityInspectorPanel,
} from "@/components/shared/useEntityInspector";
import {
  KVPairs,
  Timeline,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/** Build an EntityInspection for a single attendance day entry. */
function buildAttendanceInspection(
  date: string,
  status: string | null,
  nextClasses: Array<{ periodNo: number; start: string; end: string; hall: string; faculty: string; subject: string }>
): EntityInspection {
  const isPresent = status?.toUpperCase() === "PRESENT" || status?.toUpperCase() === "IN";
  const isAbsent = status?.toUpperCase() === "ABSENT" || status?.toUpperCase() === "OUT";
  const tone = isPresent ? "ok" : isAbsent ? "danger" : "neutral";

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Date", value: new Date(date + "T00:00:00").toLocaleDateString() },
            { label: "Status", value: status?.toUpperCase() ?? "UNMARKED" },
            { label: "Day of week", value: new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" }) },
          ]}
        />
      ),
    },
  ];

  // Context: scheduled classes for that day
  if (nextClasses.length > 0) {
    sections.push({
      title: "Scheduled classes",
      collapsible: true,
      content: (
        <div className="space-y-1.5 text-xs">
          {nextClasses.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-medium">P{c.periodNo}</span>
              <span className="text-text-muted">{c.start}–{c.end}</span>
              <span className="text-text-muted">{c.faculty}</span>
              <span className="text-text-muted">{c.hall}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Actions: student can dispute this day
  sections.push({
    title: "Actions",
    content: (
      <ActionRow>
        <InspectorButton href="/student/attendance" variant="primary">
          File dispute for this day
        </InspectorButton>
      </ActionRow>
    ),
  });

  return {
    kind: "attendance",
    title: new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    subtitle: date,
    status: <StatusBadge text={status?.toUpperCase() ?? "UNMARKED"} tone={tone} />,
    sections,
    detailHref: "/student/attendance",
    detailLabel: "All attendance",
  };
}

// ── Types from API ──────────────────────────────────────────────────────────

interface OverviewPayload {
  period: string;
  range: { from: string; to: string };
  summary: { present: number; absent: number; unmarked: number; total: number; pct: number };
  prev: { present: number; absent: number; total: number; pct: number };
  delta: number;
  daily: Array<{ date: string; status: string | null }>;
  nextClasses: Array<{
    periodNo: number;
    start: string;
    end: string;
    hall: string;
    faculty: string;
    subject: string;
  }>;
  flexibleToday: Array<{
    date: string;
    start: string;
    end: string;
    hall: string;
    type: string;
  }>;
}

const PERIOD_KEYS: PeriodKey[] = PERIOD_OPTIONS.map((o) => o.key);

// ── Component ───────────────────────────────────────────────────────────────

export function StudentAttendancePage() {
  const { exportCSV } = useExport();
  const { addToast } = useUIStore();
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dispute / mark-present form
  const [showDispute, setShowDispute] = useState(false);
  const [disputeDate, setDisputeDate] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/attendance/overview?period=${period}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) {
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────

  const s = data?.summary;
  const dailySeries = useMemo(
    () => (data?.daily ?? []).map((d) => (d.status ? (d.status.toUpperCase() === "ABSENT" || d.status === "ABSENT" ? 1 : 0) : 0.5)),
    [data]
  );
  const dailyCounts = useMemo(
    () => (data?.daily ?? []).map((d) => {
      if (d.status === null) return 0;
      return d.status.toUpperCase() === "PRESENT" || d.status === "IN" ? 1 : -1;
    }),
    [data]
  );

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.daily.map((d) => ({
        date: d.date,
        status: d.status ?? "UNMARKED",
      })),
      [
        { key: "date", header: "Date" },
        { key: "status", header: "Status" },
      ],
      `attendance_${period}.csv`
    );
  };

  const handleDispute = async () => {
    if (!disputeDate || !disputeReason) {
      addToast({ variant: "warning", title: "Missing fields", message: "Select a date and enter a reason." });
      return;
    }
    setSubmittingDispute(true);
    try {
      const res = await fetch("/api/student/attendance/dispute", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ date: disputeDate, reason: disputeReason }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast({ variant: "success", title: "Dispute filed", message: "Your dispute has been sent to the faculty inbox." });
        setShowDispute(false);
        setDisputeDate("");
        setDisputeReason("");
      } else {
        addToast({ variant: "error", title: "Dispute failed", message: body?.error?.message ?? "Could not file dispute." });
      }
    } catch {
      addToast({ variant: "error", title: "Dispute failed", message: "Network error — please try again." });
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Next class in 15-min window
  const nowStr = useMemo(() => new Date().toTimeString().slice(0, 5), []);
  const nextClass = useMemo(() => {
    const classes = data?.nextClasses ?? [];
    return classes.find((c) => c.start > nowStr) ?? null;
  }, [data, nowStr]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <WidgetBoundary name="StudentAttendancePage" resetKey={period}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-action-primary shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-text-primary">My Attendance</h1>
              <p className="text-xs text-text-muted">See · Edit · Dispute · Compare · Export · Remind</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!data || data.daily.length === 0}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_KEYS.map((key) => {
            const opt = PERIOD_OPTIONS.find((o) => o.key === key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  period === key
                    ? "bg-action-primary text-white"
                    : "bg-bg-elevated text-text-secondary border border-border hover:bg-bg-surface"
                )}
              >
                {opt?.label ?? key}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-40 rounded-xl" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <ErrorRecoveryBanner
            error={error}
            onRetry={() => void load()}
            safeHomeHref="/student"
            safeHomeLabel="Back to Student Home"
          />
        )}

        {/* Data */}
        {data && s && !loading && (
          <>
            <AttendanceNextPeriodRadar
              overallAttended={s.present}
              overallTotal={s.total}
              upcomingPeriods={(data.nextClasses ?? [])
                .filter((c) => !c.end || c.end > nowStr)
                .map((c, idx) => ({
                  id: `p-${c.periodNo ?? idx}`,
                  periodNumber: c.periodNo ?? idx + 1,
                  subjectCode: c.subject ?? "CLASS",
                  subjectName: c.subject ?? "Scheduled Class",
                  facultyName: c.faculty ?? null,
                  roomNumber: c.hall ?? null,
                  startTime: c.start,
                  endTime: c.end,
                  status: "scheduled" as const,
                }))}
            />
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* This period */}
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide">Attendance</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-text-primary tabular-nums">{s.pct}%</span>
                  {data.prev.total > 0 && <DeltaBadge value={s.pct} reference={data.prev.pct} label="vs prev" />}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {s.present} present · {s.absent} absent · {s.unmarked} unmarked
                </p>
              </div>

              {/* Previous period */}
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide">Last period</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-text-secondary tabular-nums">{data.prev.pct}%</span>
                  {data.delta > 0 && (
                    <span className="inline-flex items-center text-xs text-action-success">
                      <TrendingUp className="h-3.5 w-3.5" /> +{data.delta}
                    </span>
                  )}
                  {data.delta < 0 && (
                    <span className="inline-flex items-center text-xs text-action-danger">
                      <TrendingDown className="h-3.5 w-3.5" /> {data.delta}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {data.prev.present} present · {data.prev.absent} absent
                </p>
              </div>

              {/* 30-day sparkline */}
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide">Last 30 days</p>
                <div className="mt-2">
                  <MiniSparkline data={dailyCounts} width={160} height={40} />
                </div>
                <p className="text-[10px] text-text-muted mt-1">Green = present · Red = absent</p>
              </div>
            </div>

            {/* 30-day heatmap */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <p className="text-xs font-medium text-text-muted mb-3">Daily status — last 30 days</p>
              <div className="grid grid-cols-7 gap-1.5">
                {data.daily.map((d, i) => {
                  const status = d.status?.toUpperCase();
                  const isPresent = status === "PRESENT" || status === "IN";
                  const isAbsent = status === "ABSENT" || status === "OUT";
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => inspect(buildAttendanceInspection(d.date, d.status, data.nextClasses ?? []))}
                      className={cn(
                        "aspect-square rounded-full text-[10px] flex items-center justify-center font-mono hover:ring-2 hover:ring-action-primary/40 transition",
                        isPresent && "bg-action-success/20 text-action-success ring-1 ring-action-success/40",
                        isAbsent && "bg-action-danger/20 text-action-danger ring-1 ring-action-danger/40",
                        !status && "bg-bg-surface text-text-muted ring-1 ring-border"
                      )}
                      title={`${d.date}: ${status ?? "Unmarked"}`}
                    >
                      {new Date(d.date + "T00:00:00").getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="inline-flex items-center gap-1 text-action-success"><span className="size-2 rounded-full bg-action-success/50" /> Present</span>
                <span className="inline-flex items-center gap-1 text-action-danger"><span className="size-2 rounded-full bg-action-danger/50" /> Absent</span>
                <span className="inline-flex items-center gap-1 text-text-muted"><span className="size-2 rounded-full bg-bg-surface ring-1 ring-border" /> Unmarked</span>
              </div>
            </div>

            {/* Today's schedule strip */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Today&apos;s schedule
                </p>
                {nextClass && (
                  <p className="text-xs text-action-success flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Next: {nextClass.start}–{nextClass.end} · {nextClass.faculty}
                  </p>
                )}
              </div>
              {(data.nextClasses?.length ?? 0) > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(data.nextClasses ?? []).map((c) => (
                    <div
                      key={c.periodNo}
                      className={cn(
                        "min-w-[140px] rounded-lg border px-3 py-2 text-xs flex-shrink-0",
                        c.start === nowStr
                          ? "border-action-primary bg-action-primary/10"
                          : "border-border bg-bg-base"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">P{c.periodNo}</span>
                        <span className="text-text-muted tabular-nums">{c.start}–{c.end}</span>
                      </div>
                      <p className="text-text-secondary mt-1 flex items-center gap-1">
                        <User className="h-4 w-4" /> {c.faculty}
                      </p>
                      <p className="text-text-muted flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {c.hall || "TBA"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No classes scheduled today.</p>
              )}
              {(data.flexibleToday?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wide text-action-warning mb-1.5">Flexible overrides</p>
                  <div className="flex flex-wrap gap-2">
                    {(data.flexibleToday ?? []).map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-action-warning/10 border border-action-warning/30 px-2 py-0.5 text-xs text-action-warning">
                        {f.type} · {f.start}–{f.end} · {f.hall}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dispute / mark-present */}
            <div className="rounded-xl border border-border bg-bg-elevated p-4">
              <button
                type="button"
                onClick={() => setShowDispute((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-action-primary"
              >
                <Pencil className="h-4 w-4" />
                {showDispute ? "Hide" : "Mark present / Dispute a day"}
              </button>

              {showDispute && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Date</label>
                    <input
                      type="date"
                      value={disputeDate}
                      onChange={(e) => setDisputeDate(e.target.value)}
                      className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Reason (required)</label>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value.slice(0, 280))}
                      placeholder="e.g. I was in Physics 10–11 on Tuesday but marked absent"
                      rows={2}
                      className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDispute()}
                    disabled={submittingDispute}
                    className="w-full rounded-lg bg-action-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingDispute ? "Filing…" : "File dispute → Faculty inbox"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </WidgetBoundary>
  );
}

export default StudentAttendancePage;
