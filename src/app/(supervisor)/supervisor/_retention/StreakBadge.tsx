"use client";

import { Flame, DoorOpen } from "lucide-react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const cleanStreak = useSupervisorRetention((s) => s.cleanShiftStreak);
  const handoverStreak = useSupervisorRetention((s) => s.handoverStreak);

  if (compact) {
    if (cleanStreak === 0 && handoverStreak === 0) return null;
    return (
      <div className="flex gap-1">
        {cleanStreak > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--action-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--action-primary)]">
            <DoorOpen className="size-2.5" />
            {cleanStreak}
          </span>
        )}
        {handoverStreak > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--action-info)]/10 px-1.5 py-0.5 text-[10px] text-[var(--action-info)]">
            <Flame className="size-2.5" />
            {handoverStreak}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {cleanStreak > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--action-primary)]/30 bg-[var(--action-primary)]/10 px-2.5 py-1 text-xs text-[var(--action-primary)]"
          title="Shifts with zero gate downtime and zero unresolved incidents"
        >
          <DoorOpen className="size-3" />
          <span className="font-semibold tabular-nums">{cleanStreak}</span>
          <span>clean shift{cleanStreak === 1 ? "" : "s"}</span>
        </div>
      )}
      {handoverStreak > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--action-info)]/30 bg-[var(--action-info)]/10 px-2.5 py-1 text-xs text-[var(--action-info)]"
          title="Consecutive handovers submitted on time"
        >
          <Flame className="size-3" />
          <span className="font-semibold tabular-nums">{handoverStreak}</span>
          <span>handover{handoverStreak === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
}
