"use client";

import { Flame } from "lucide-react";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const streak = usePrincipalRetention((s) => s.authorityStreak);
  if (streak === 0 && compact) return null;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-[var(--action-warning)]/30 bg-[var(--action-warning)]/10 px-2.5 py-1 ${
        compact ? "text-[10px]" : "text-xs"
      } text-[var(--action-warning)]`}
      title="Consecutive workdays with zero overdue escalations"
    >
      <Flame className="size-3" aria-hidden />
      <span className="font-semibold tabular-nums">{streak}</span>
      {!compact && <span>zero-overdue day{streak === 1 ? "" : "s"}</span>}
    </div>
  );
}
