"use client";

import { useSyncExternalStore } from "react";
import { Flame, GraduationCap } from "lucide-react";

interface RetentionSnapshot {
  teachingStreak: number;
  facultyStreak: number;
  sessionDecisions: number;
  todayWinsCount: number;
}

const emptySnapshot: RetentionSnapshot = {
  teachingStreak: 0,
  facultyStreak: 0,
  sessionDecisions: 0,
  todayWinsCount: 0,
};

function getSnapshot(): RetentionSnapshot {
  if (typeof window === "undefined") return emptySnapshot;
  try {
    const raw = localStorage.getItem("hod-retention");
    if (!raw) return emptySnapshot;
    const parsed = JSON.parse(raw);
    const state = parsed.state || {};
    return {
      teachingStreak: Number(state.teachingStreak) || 0,
      facultyStreak: Number(state.facultyStreak) || 0,
      sessionDecisions: Number(state.sessionDecisions) || 0,
      todayWinsCount: Array.isArray(state.todayWins) ? state.todayWins.length : 0,
    };
  } catch {
    return emptySnapshot;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function WeekBar() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);

  return (
    <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 bg-bg-elevated/50 px-3 py-2 text-xs">
      <span className="text-text-muted">
        <span className="font-semibold text-text-primary">{data.sessionDecisions}</span> decisions this session
        {data.todayWinsCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-text-primary">{data.todayWinsCount}</span> today
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        {data.teachingStreak > 0 && (
          <div
            className="surface-card flex items-center gap-1 (--action-info,var(--action-primary))]/30 bg-[var(--action-info,var(--action-primary))]/10 px-2 py-0.5 text-xs text-[var(--action-info,var(--action-primary))]"
            title="Class marking streak"
          >
            <GraduationCap className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{data.teachingStreak}</span>
          </div>
        )}
        {data.facultyStreak > 0 && (
          <div
            className="surface-card flex items-center gap-1 bg-action-warning/10 px-2 py-0.5 text-xs text-action-warning"
            title="Zero-escalation faculty streak"
          >
            <Flame className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{data.facultyStreak}</span>
          </div>
        )}
      </div>
    </div>
  );
}
