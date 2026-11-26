"use client";

import { Flame, ShieldCheck } from "lucide-react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

export function WeekBar() {
  const sessionDecisions = useSupervisorRetention((s) => s.sessionDecisions);
  const shiftWinsCount = useSupervisorRetention((s) => s.shiftWins.length);
  const cleanShiftStreak = useSupervisorRetention((s) => s.cleanShiftStreak);
  const handoverStreak = useSupervisorRetention((s) => s.handoverStreak);

  return (
    <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 bg-bg-elevated/50 px-3 py-2 text-xs">
      <span className="text-text-muted">
        <span className="font-semibold text-text-primary">{sessionDecisions}</span> decisions this shift
        {shiftWinsCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-text-primary">{shiftWinsCount}</span> cleared
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        {cleanShiftStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full bg-action-info/10 px-2 py-0.5 text-xs text-action-info"
            title="Clean shift streak"
          >
            <ShieldCheck className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{cleanShiftStreak}</span>
            <span className="hidden sm:inline text-[10px] opacity-80">clean shifts</span>
          </div>
        )}
        {handoverStreak > 0 && (
          <div
            className="flex items-center gap-1 rounded-full bg-action-warning/10 px-2 py-0.5 text-xs text-action-warning"
            title="On-time handover streak"
          >
            <Flame className="size-3" aria-hidden />
            <span className="font-semibold tabular-nums">{handoverStreak}</span>
            <span className="hidden sm:inline text-[10px] opacity-80">handover streak</span>
          </div>
        )}
      </div>
    </div>
  );
}
