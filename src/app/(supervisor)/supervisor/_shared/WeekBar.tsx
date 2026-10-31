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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-3 py-2 text-[11px]">
      <span className="text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text-primary)]">{data.sessionDecisions}</span> decisions this session
        {data.todayWinsCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-[var(--text-primary)]">{data.todayWinsCount}</span> today
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        {data.teachingStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full border border-[var(--action-info,#3b82f6)]/30 bg-[var(--action-info,#3b82f6)]/10 px-2 py-0.5 text-[10px] text-[var(--action-info,#3b82f6)]"
            title="Class marking streak"
          >
            <GraduationCap className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{data.teachingStreak}</span>
          </div>
        )}
        {data.facultyStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full border border-[var(--action-warning)]/30 bg-[var(--action-warning)]/10 px-2 py-0.5 text-[10px] text-[var(--action-warning)]"
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
