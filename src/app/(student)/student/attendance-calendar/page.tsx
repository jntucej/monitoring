"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { AttendanceNextPeriodRadar } from "@/components/student/AttendanceNextPeriodRadar";
import { LifefulCalendarAgenda } from "@/components/nav/LifefulCalendarAgenda";
import { ErrorRecoveryBanner } from "@/components/shared/ErrorRecoveryBanner";


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
  const isSakuga = useIsSakuga();
  const [weekView, setWeekView] = useState(false);
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

  // For week view: show only the week containing today (or the selected date)
  const anchorDate = selectedDate ? new Date(selectedDate) : now;
  const weekStart = new Date(anchorDate);
  weekStart.setDate(anchorDate.getDate() - anchorDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-action-primary" />
            <h1 className="text-xl font-bold text-text-primary">Attendance Calendar</h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Day-by-day attendance record and gate check-in/out times.
          </p>
        </div>
        <Link
          href="/student/attendance"
          className="inline-flex items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-action-primary transition-colors"
        >
          Attendance Summary <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* View toggle — sakuga-VFX toggle when the theme is active */}
      {isSakuga ? (
        <div className="surface-card bg-bg-surface p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-primary">{weekView ? "Week view" : "Month view"}</p>
            <p className="text-xs text-text-muted">{weekView ? "Last 7 days" : "Full calendar"}</p>
          </div>
          <sakuga-toggle
            checked={weekView}
            label="week view"
            onChange={((e: unknown) => setWeekView(Boolean((e as any).target?.checked ?? (e as any)))) as any}
          >
            week
          </sakuga-toggle>
        </div>
      ) : (
        <div className="surface-card bg-bg-surface p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-primary">{weekView ? "Week view" : "Month view"}</p>
            <p className="text-xs text-text-muted">{weekView ? "Last 7 days" : "Full calendar"}</p>
          </div>
          <button
            type="button"
            onClick={() => setWeekView((v) => !v)}
            className={`surface-card px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
              weekView
                ? "bg-action-primary text-white"
                : "bg-bg-elevated text-text-muted hover:text-text-primary"
            }`}
          >
            {weekView ? "Month" : "Week"}
          </button>
        </div>
      )}

      {error && (
        <ErrorRecoveryBanner
          error={error}
          safeHomeHref="/student"
          safeHomeLabel="Back to Student Home"
        />
      )}

      {summary && (
        <AttendanceNextPeriodRadar
          overallAttended={summary.present}
          overallTotal={summary.present + summary.absent}
          upcomingPeriods={[]}
        />
      )}

      <div className="surface-card bg-bg-surface p-4 min-w-0">
        {/* Month navigation — hidden in week view */}
        {!weekView && (
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="surface-card min-h11 inline-flex items-center justify-center bg-bg-elevated px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
            >
              ← Prev
            </button>
            <p className="text-sm font-bold text-text-primary">
              {MONTH_NAMES[month]} {year}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="surface-card min-h11 inline-flex items-center justify-center bg-bg-elevated px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
            >
              Next →
            </button>
          </div>
        )}

        {/* Weekday header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-8 text-xs text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading calendar…
          </div>
        ) : weekView ? (
          /* Week view: 7 day cells */
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((dayKey) => {
              const dayNum = new Date(dayKey).getDate();
              const day = days.find((d) => d.date === dayKey);
              const state: "present" | "absent" | "unmarked" | "today" | "future" =
                dayKey === now.toISOString().slice(0, 10)
                  ? "today"
                  : day
                  ? (day.time_in ? "present" : day.status ? (["absent", "out"].includes(day.status.toLowerCase()) ? "absent" : "present") : "unmarked")
                  : "unmarked";

              const isSelected = selectedDate === dayKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                  className={`h-14 rounded-xl text-sm font-bold flex flex-col items-center justify-center transition-colors ${
                    state === "present"
                      ? "bg-emerald-500/15 text-action-success border border-emerald-500/30"
                      : state === "absent"
                      ? "bg-rose-500/15 text-action-danger border border-rose-500/30"
                      : state === "today"
                      ? "bg-sky-500/15 text-action-info border border-sky-500/40"
                      : "text-text-muted border border-transparent hover:bg-bg-elevated"
                  } ${isSelected ? "ring-2 ring-action-primary" : ""}`}
                >
                  <span className="text-xs text-text-muted">{new Date(dayKey).toLocaleDateString([], { weekday: "short" })}</span>
                  <span>{dayNum}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map((dayNum, i) => {
              if (dayNum === null) return <div key={`empty-${i}`} className="h-4" />;
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
                  className={`h-4 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
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
        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><span className="size-4 bg-emerald-500/40 border border-emerald-500/60" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="size-4 bg-rose-500/40 border border-rose-500/60" /> Absent</span>
          <span className="flex items-center gap-1.5"><span className="size-4 bg-bg-elevated border border-border" /> Unmarked</span>
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <LifefulCalendarAgenda
          selectedDateLabel={selected.date}
          isToday={selected.date === new Date().toISOString().slice(0, 10)}
          onJumpToday={() => {
            const today = new Date();
            setYear(today.getFullYear());
            setMonth(today.getMonth());
            setSelectedDate(today.toISOString().slice(0, 10));
          }}
          items={[
            {
              id: `att-${selected.date}`,
              title: `Attendance: ${selected.status ?? "Unmarked"}`,
              category: "attendance",
              timeRange:
                selected.time_in || selected.time_out
                  ? `${selected.time_in || "—"} → ${selected.time_out || "—"}`
                  : null,
              status: selected.status ?? "unmarked",
              actionLabel: "Verify Gate Scan Log",
              actionHref: "/student/history",
            },
          ]}
          quickLinks={[
            { label: "Full Week Calendar", href: "/student/calendar" },
            { label: "Report Discrepancy", href: "/student/complaints/new" },
          ]}
        />
      )}

      {/* Monthly summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="surface-card bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5 text-action-success mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">Present</span>
            </div>
            <p className="text-xl font-black text-action-success">{summary.present}</p>
          </div>
          <div className="surface-card bg-rose-500/5 p-3">
            <div className="flex items-center gap-1.5 text-action-danger mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-bold">Absent</span>
            </div>
            <p className="text-xl font-black text-action-danger">{summary.absent}</p>
          </div>
          <div className="surface-card bg-bg-elevated p-3">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">Unmarked</span>
            </div>
            <p className="text-xl font-black text-text-primary">{summary.unmarked}</p>
          </div>
        </div>
      )}

      {/* CTA to history */}
      <div className="surface-card bg-bg-elevated/50 p-3 text-xs flex items-center justify-between gap-3 min-w-0">
        <span className="text-text-muted min-w-0 truncate">
          See your full gate entry/exit history for day-by-day detail.
        </span>
        <Link
          href="/student/history"
          className="surface-card inline-flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-action-success hover:bg-emerald-500/20 shrink-0"
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
