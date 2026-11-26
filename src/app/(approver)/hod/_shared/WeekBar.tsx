"use client";

import { Flame, GraduationCap } from "lucide-react";
import { useHodRetention } from "@/stores/hodRetentionStore";

export function WeekBar() {
  const sessionDecisions = useHodRetention((s) => s.sessionDecisions);
  const todayWinsCount = useHodRetention((s) => s.todayWins.length);
  const teachingStreak = useHodRetention((s) => s.teachingStreak);
  const facultyStreak = useHodRetention((s) => s.facultyStreak);

  return (
    <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 bg-bg-elevated/50 px-3 py-2 text-xs">
      <span className="text-text-muted">
        <span className="font-semibold text-text-primary">{sessionDecisions}</span> decisions this session
        {todayWinsCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-text-primary">{todayWinsCount}</span> today
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        {teachingStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full bg-action-info/10 px-2 py-0.5 text-xs text-action-info"
            title="Class marking streak"
          >
            <GraduationCap className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{teachingStreak}</span>
            <span className="hidden sm:inline text-[10px] opacity-80">class streak</span>
          </div>
        )}
        {facultyStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full bg-action-warning/10 px-2 py-0.5 text-xs text-action-warning"
            title="Zero-escalation faculty streak"
          >
            <Flame className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{facultyStreak}</span>
            <span className="hidden sm:inline text-[10px] opacity-80">no-escalation streak</span>
          </div>
        )}
      </div>
    </div>
  );
}
