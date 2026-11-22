"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  AlertCircle,
  ChevronRight,
  Percent,
  TrendingUp,
  TrendingDown,
  FileDown,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { cn } from "@/lib/utils";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { RaiseIssueButton } from "@/components/shared/RaiseIssueButton";
import { ScheduleStrip, type ScheduleItem } from "@/components/shared/ScheduleStrip";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentWidgetProps } from "./index";

// ── Types ──────────────────────────────────────────────────────────────────

interface AttendancePayload {
  data: {
    period: string;
    range: { from: string; to: string };
    summary: {
      total: number;
      present: number;
      absent: number;
      unmarked: number;
      pct: number;
      lastMonthPct: number | null;
      delta: number | null;
    };
    subjects: Array<{
      classId: string | null;
      present: number;
      absent: number;
      total: number;
      pct: number;
      avgTimeMinutes: number;
    }>;
    disputes: Array<{
      id: string;
      date: string;
      reason: string;
      status: string;
      createdAt: string;
      resolvedAt: string | null;
    }>;
    upcoming: Array<{
      date: string;
      subject: string;
      faculty: string;
      timeIn: string | null;
      timeOut: string | null;
    }>;
  };
}

// ── Main widget ────────────────────────────────────────────────────────────

export default function AttendanceCard({ payload }: StudentWidgetProps) {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();

  const { data, loading, refresh } = useApiResource<AttendancePayload>(
    `/api/student/attendance?period=${period.key === "all-time" ? "all-time" : period.key}`,
    { ttlMs: 30_000, deps: [period.key] }
  );

  const [disputeDate, setDisputeDate] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);

  const d = data?.data;

  const handleDisputeSubmit = async (reason: string, category?: string) => {
    const res = await fetch("/api/student/attendance/dispute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: disputeDate,
        reason: category ? `${category}: ${reason}` : reason,
      }),
    });
    if (!res.ok) throw new Error("Failed to raise dispute");
    setDisputeOpen(false);
    setDisputeDate("");
    void refresh();
  };

  const scheduleItems: ScheduleItem[] = (d?.upcoming ?? []).map((u) => ({
    id: u.date,
    title: u.subject,
    subtitle: u.faculty,
    start: `${u.date}T${u.timeIn ?? "09:00:00"}`,
    end: `${u.date}T${u.timeOut ?? "10:00:00"}`,
  }));

  const handleExport = () => {
    if (!d) return;
    exportCSV(
      [
        { date: d.range.from, status: `period=${d.period}`, present: d.summary.present, absent: d.summary.absent },
        ...d.subjects.map((s) => ({
          date: d.range.from,
          status: `subject=${s.classId ?? "—"}`,
          present: s.present,
          absent: s.absent,
        })),
      ],
      [
        { key: "date", header: "Date" },
        { key: "status", header: "Item" },
        { key: "present", header: "Present" },
        { key: "absent", header: "Absent" },
      ],
      `attendance_${d.period}.csv`
    );
  };

  return (
    <WidgetBoundary name="AttendanceCard" resetKey={period.key}>
      <div className="surface-card p-5 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-action-primary/10 text-action-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Attendance</h3>
              <p className="text-xs text-text-muted">{d?.range.from ?? "Loading…"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
            <RaiseIssueButton
              label="Dispute"
              categories={["I was present", "Wrong mark", "Forgot to mark"]}
              onSubmit={handleDisputeSubmit}
              className="text-xs"
            />
          </div>
        </div>

        {/* Period picker */}
        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {loading && !d ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : !d ? (
          <EmptyState title="No attendance data" description="Nothing recorded for this period yet." />
        ) : (
          <>
            {/* Big percentage + delta */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <Percent className="h-5 w-5 text-action-primary" />
                <span className="text-3xl font-bold text-text-primary tabular-nums">{d.summary.pct}%</span>
              </div>
              <DeltaBadge
                value={d.summary.pct}
                reference={d.summary.lastMonthPct}
                label="vs last month"
              />
              <div className="ml-auto text-xs text-text-muted tabular-nums">
                {d.summary.present} present · {d.summary.absent} absent · {d.summary.unmarked} unmarked
              </div>
            </div>

            {/* Upcoming schedule */}
            {scheduleItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Upcoming</p>
                <ScheduleStrip items={scheduleItems} />
              </div>
            )}

            {/* Subject breakdown */}
            {d.subjects.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">By class</p>
                <div className="space-y-2">
                  {d.subjects.map((s) => (
                    <div
                      key={s.classId ?? "misc"}
                      className="flex items-center justify-between text-sm rounded-lg bg-bg-elevated px-3 py-2"
                    >
                      <span className="text-text-secondary truncate max-w-[8rem]">
                        {s.classId ?? "General"}
                      </span>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        <span className="text-emerald-500">{s.present}p</span>
                        <span className="text-rose-500">{s.absent}a</span>
                        <span className={cn("font-medium", s.pct >= 75 ? "text-emerald-500" : s.pct >= 60 ? "text-amber-500" : "text-rose-500")}>
                          {s.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open disputes */}
            {d.disputes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Open disputes</p>
                <div className="space-y-1.5">
                  {d.disputes.slice(0, 3).map((dsp) => (
                    <div key={dsp.id} className="flex items-center gap-2 text-xs bg-rose-500/5 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-text-secondary truncate flex-1">{dsp.reason}</span>
                      <span className="text-text-muted shrink-0 tabular-nums">{dsp.date}</span>
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

export type { AttendancePayload };
