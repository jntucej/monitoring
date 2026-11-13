"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";


import { CalendarDays, CheckCircle2, XCircle, Clock, Loader2, ArrowRight } from "lucide-react";

/* ── response shape ── */

interface AttendanceCalendarResponse {
  success: boolean;
  data: {
    month: string; // "YYYY-MM"
    days: Array<{ date: string; status: string | null; time_in: string | null; time_out: string | null }>;
    summary: { present: number; absent: number; unmarked: number; total: number };
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];



  







function StudentAttendanceCalendarInner() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data, loading, error } = useApiResource<AttendanceCalendarResponse>(
    `/api/student/attendance-calendar?month=${monthKey}`,
    { ttlMs: 60_000 }
  );

  const days = data?.data.days ?? [];
  const summary = data?.data.summary;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const grid: Array<number | null> = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selected = selectedDate ? days.find((d) => d.date === selectedDate) : null;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-action-primary" />
        <p className="text-sm font-semibold text-text-primary">Attendance Calendar</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-action-danger">
          Attendance data unavailable: {error}. Check your connection or retry later.
        </div>
      )}

      <div className="rounded-xl border border-border bg-bg-surface p-4 min-w-0">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
          >
            ← Prev
          </button>
          <p className="text-sm font-bold text-text-primary">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            type="button"
            onClick={nextMonth}
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
          >
            Next →
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-8 text-xs text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading calendar…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map((dayNum, i) => {
              if (dayNum === null) return <div key={`empty-${i}`} className="h-10" />;
              const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const day = days.find((d) => d.date === dayKey);
              const state: "present" | "absent" | "unmarked" | "today" | "future" =
                dayNum === now.getDate() && month === now.getMonth() && year === now.getFullYear()
                  ? "today"
                  : dayNum > now.getDate() && (month > now.getMonth() || year > now.getFullYear())
                  ? "future"
                  : day
                  ? (day.time_in ? "present" : day.status ? (["absent", "out"].includes(day.status.toLowerCase()) ? "absent" : "present") : "unmarked")
                  : "unmarked";

              const isSelected = selectedDate === dayKey;
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                  className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                    state === "present"
                      ? "bg-emerald-500/15 text-action-success border border-emerald-500/30"
                      : state === "absent"
                      ? "bg-rose-500/15 text-action-danger border border-rose-500/30"
                      : state === "today"
                      ? "bg-sky-500/15 text-action-info border border-sky-500/40"
                      : "text-text-muted border border-transparent hover:bg-bg-elevated"
                  } ${isSelected ? "ring-2 ring-action-primary" : ""}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500/60" /> Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-bg-elevated border border-border" /> Unmarked</span>
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <div className="rounded-xl border border-border bg-bg-elevated p-4 text-xs min-w-0">
          <p className="font-bold text-text-primary mb-2">{selected.date}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-text-muted">Time in</p>
              <p className="font-mono text-text-primary">{selected.time_in || "—"}</p>
            </div>
            <div>
              <p className="text-text-muted">Time out</p>
              <p className="font-mono text-text-primary">{selected.time_out || "—"}</p>
            </div>
          </div>
          {selected.status && (
            <p className="mt-2 text-text-muted">
              Status: <span className="font-bold text-text-primary">{selected.status}</span>
            </p>
          )}
        </div>
      )}

      {/* Monthly summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5 text-action-success mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">Present</span>
            </div>
            <p className="text-xl font-black text-action-success">{summary.present}</p>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <div className="flex items-center gap-1.5 text-action-danger mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-bold">Absent</span>
            </div>
            <p className="text-xl font-black text-action-danger">{summary.absent}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-3">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">Unmarked</span>
            </div>
            <p className="text-xl font-black text-text-primary">{summary.unmarked}</p>
          </div>
        </div>
      )}

      {/* CTA to history */}
      <div className="rounded-xl border border-dashed border-border bg-bg-elevated/50 p-3 text-xs flex items-center justify-between gap-3 min-w-0">
        <span className="text-text-muted min-w-0 truncate">
          See your full gate entry/exit history for day-by-day detail.
        </span>
        <Link
          href="/student/history"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-action-success hover:bg-emerald-500/20 shrink-0"
        >
          Entry/Exit History <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}

export default function StudentAttendanceCalendarPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentAttendanceCalendarInner />
    </Suspense>
  );
}
