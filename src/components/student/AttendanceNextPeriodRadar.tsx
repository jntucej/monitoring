"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  CalendarDays,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { computeAttendanceCushion } from "@/lib/attendance-schedule-math";

export interface StudentPeriodSlot {
  id: string;
  periodNumber: number;
  subjectCode: string;
  subjectName: string;
  facultyName?: string | null;
  roomNumber?: string | null;
  startTime: string;
  endTime: string;
  status?: "scheduled" | "confirmed" | "cancelled" | "swapped" | "exam";
  attendancePct?: number;
}

export interface SubjectStanding {
  subjectCode: string;
  subjectName: string;
  attended: number;
  total: number;
  thresholdPct?: number;
}

export const computeAttendanceBuffer = computeAttendanceCushion;

export function AttendanceNextPeriodRadar({
  overallAttended,
  overallTotal,
  thresholdPct = 75,
  upcomingPeriods = [],
  subjects = [],
}: {
  overallAttended: number;
  overallTotal: number;
  thresholdPct?: number;
  upcomingPeriods: StudentPeriodSlot[];
  subjects?: SubjectStanding[];
}) {
  const router = useRouter();
  const isSakuga = useIsSakuga();

  const overall = useMemo(
    () => computeAttendanceBuffer(overallAttended, overallTotal, thresholdPct),
    [overallAttended, overallTotal, thresholdPct],
  );

  const nextPeriod = upcomingPeriods[0] ?? null;
  const laterPeriods = upcomingPeriods.slice(1, 4);

  const renderRouteBtn = (
    href: string,
    label: string,
    variant: "primary" | "secondary" = "secondary",
    icon?: React.ReactNode,
  ) => {
    if (isSakuga) {
      return (
        <sakuga-button variant={variant} onClick={() => router.push(href)}>
          <span className="inline-flex items-center gap-1 text-xs">
            {icon}
            <span>{label}</span>
          </span>
        </sakuga-button>
      );
    }
    return (
      <Link
        href={href}
        className={
          variant === "primary"
            ? "surface-card inline-flex items-center gap-1 bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
            : "surface-card inline-flex items-center gap-1 bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
        }
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <section data-testid="attendance-next-period-radar" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Attendance Cushion Card */}
        <div className="surface-card bg-bg-surface p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Attendance Standing (Target {thresholdPct}%)
              </p>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="text-2xl font-bold tracking-tight text-text-primary">
                  {overall.pct}%
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {overallAttended}/{overallTotal} classes
                </span>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                overall.atRisk
                  ? "bg-rose-500/15 text-action-danger"
                  : "bg-emerald-500/15 text-action-success"
              }`}
            >
              {overall.atRisk ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Needs Recovery</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>On Track</span>
                </>
              )}
            </span>
          </div>

          <p className="text-xs text-text-muted">
            {overall.atRisk
              ? `Attend the next ${overall.classesNeeded} consecutive class${overall.classesNeeded === 1 ? "" : "es"} to reach ${thresholdPct}%.`
              : `You have a buffer of ${overall.safeSkips} class${overall.safeSkips === 1 ? "" : "es"} before dropping below ${thresholdPct}%.`}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            {renderRouteBtn(
              "/student/attendance-calendar",
              "Day-by-Day Calendar",
              "primary",
              <CalendarDays className="h-3.5 w-3.5" />,
            )}
            {renderRouteBtn(
              "/student/history",
              "Gate Scan Log",
              "secondary",
              <ArrowUpRight className="h-3.5 w-3.5" />,
            )}
          </div>
        </div>

        {/* Next Period & Upcoming Slots Card */}
        <div className="surface-card bg-bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-action-primary">
              Next Period & Schedule
            </p>
            <Link
              href="/student/calendar"
              className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-action-primary"
            >
              <span>Full Week</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {nextPeriod ? (
            <div className="surface-card bg-bg-elevated/50 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-action-primary">
                  P{nextPeriod.periodNumber} • {nextPeriod.startTime}–{nextPeriod.endTime}
                </span>
                {nextPeriod.status && nextPeriod.status !== "scheduled" && (
                  <span className="surface-card px-2 py-0.5 text-[11px] font-medium capitalize text-text-primary bg-bg-surface">
                    {nextPeriod.status}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                {nextPeriod.subjectName}{" "}
                <span className="font-mono text-xs font-normal text-text-muted">
                  ({nextPeriod.subjectCode})
                </span>
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                {nextPeriod.roomNumber && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Room {nextPeriod.roomNumber}
                  </span>
                )}
                {nextPeriod.facultyName && (
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {nextPeriod.facultyName}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-text-muted">
              No more scheduled periods remaining right now. Check{" "}
              <Link
                href="/student/calendar"
                className="font-semibold text-action-primary hover:underline"
              >
                My Calendar
              </Link>{" "}
              for upcoming classes, exams, or campus events.
            </div>
          )}

          {laterPeriods.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-text-muted">
                Following Periods
              </p>
              <div className="flex flex-wrap gap-1.5">
                {laterPeriods.map((slot) => (
                  <span
                    key={slot.id}
                    className="surface-card inline-flex items-center gap-1.5 bg-bg-elevated px-2.5 py-1 text-xs text-text-primary"
                  >
                    <Clock className="h-3 w-3 text-text-muted" />
                    <span className="font-mono text-[11px] text-text-muted">
                      {slot.startTime}
                    </span>
                    <span className="font-medium">{slot.subjectCode}</span>
                    {slot.roomNumber && (
                      <span className="text-[11px] text-text-muted">
                        • {slot.roomNumber}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="surface-card bg-bg-surface p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Subject Attendance & Skip Buffer
            </h4>
            <Link
              href="/student/assignments"
              className="text-xs font-medium text-action-primary hover:underline"
            >
              Assignments →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {subjects.map((sub) => {
              const info = computeAttendanceBuffer(
                sub.attended,
                sub.total,
                sub.thresholdPct ?? thresholdPct,
              );
              return (
                <div
                  key={sub.subjectCode}
                  className="surface-card bg-bg-elevated/40 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-text-primary">
                      {sub.subjectName}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono">
                      {sub.subjectCode} • {sub.attended}/{sub.total}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        info.atRisk
                          ? "text-action-danger font-medium"
                          : "text-action-success"
                      }`}
                    >
                      {info.atRisk
                        ? `Need +${info.classesNeeded} classes`
                        : `${info.safeSkips} safe skip${info.safeSkips === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="shrink-0 surface-card bg-bg-surface px-2 py-1 font-mono text-xs font-bold text-text-primary">
                    {info.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
