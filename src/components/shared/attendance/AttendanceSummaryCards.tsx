/**
 * shared/attendance/AttendanceSummaryCards.tsx — per-subject attendance
 * summary with delta + achievement cross-link. The "STATUS" step of the
 * attendance loop: "Physics: 87% · 3 absences · 1 unexcused". Also
 * surfaces the "90% attendance streak" achievement progress when active.
 */

"use client";

import { TrendingUp, TrendingDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubjectAttendance {
  subject: string;
  /** 0–1 attendance rate. */
  rate: number;
  absences: number;
  unexcused: number;
  /** Delta vs last period (percentage points, negative = worse). */
  delta: number;
}

export interface AttendanceSummaryCardsProps {
  subjects: SubjectAttendance[];
  /** The attendance achievement threshold (default 0.9 = 90%). */
  achievementThreshold?: number;
  /** Class name. */
  className?: string;
}

export function AttendanceSummaryCards({
  subjects,
  achievementThreshold = 0.9,
  className,
}: AttendanceSummaryCardsProps) {
  // Overall rate = average of subject rates.
  const overall =
    subjects.length > 0
      ? subjects.reduce((sum, s) => sum + s.rate, 0) / subjects.length
      : 0;
  const achieved = overall >= achievementThreshold;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Overall + achievement */}
      <div className="surface-card flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-text-muted">Overall attendance</p>
          <p className="text-2xl font-bold text-text">
            {(overall * 100).toFixed(0)}%
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2",
            achieved ? "bg-green-500/10 text-green-400" : "bg-bg-elevated text-text-muted",
          )}
        >
          <Trophy className="h-4 w-4" />
          <div>
            <p className="text-xs font-medium">
              {achieved
                ? "Attendance streak achieved"
                : `${Math.round((achievementThreshold - overall) * 100)}% to go for "Perfect Month"`}
            </p>
            <p className="text-[10px] opacity-70">
              {achieved ? "90%+ this period" : `${(overall * 100).toFixed(0)}% / ${Math.round(achievementThreshold * 100)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Per-subject cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {subjects.map((s) => {
          const deltaUp = s.delta > 0;
          return (
            <div key={s.subject} className="surface-card p-3">
              <p className="text-xs font-medium text-text truncate">{s.subject}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-text">
                  {(s.rate * 100).toFixed(0)}%
                </span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[10px]",
                    deltaUp ? "text-green-400" : s.delta < 0 ? "text-red-400" : "text-text-muted",
                  )}
                >
                  {deltaUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : s.delta < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {deltaUp ? "+" : ""}
                  {s.delta.toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                {s.absences} absences · {s.unexcused} unexcused
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AttendanceSummaryCards;
