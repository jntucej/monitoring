"use client";

import { useVPRetention } from "@/stores/vpRetentionStore";
import { StreakBadge } from "../_retention/StreakBadge";

export function WeekBar() {
  const session = useVPRetention((s) => s.sessionDecisions);
  const today = useVPRetention((s) => s.todayWins.length);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-3 py-2 text-[11px]">
      <span className="text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text-primary)]">{session}</span> decisions this session
        {today > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-[var(--text-primary)]">{today}</span> today
          </>
        )}
      </span>
      <StreakBadge compact />
    </div>
  );
}
