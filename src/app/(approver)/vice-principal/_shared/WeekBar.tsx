"use client";

import { useVPRetention } from "@/stores/vpRetentionStore";
import { StreakBadge } from "../_retention/StreakBadge";

export function WeekBar() {
  const session = useVPRetention((s) => s.sessionDecisions);
  const today = useVPRetention((s) => s.todayWins.length);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated/50 px-3 py-2 text-xs">
      <span className="text-text-muted">
        <span className="font-semibold text-text-primary">{session}</span> decisions this session
        {today > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-text-primary">{today}</span> today
          </>
        )}
      </span>
      <StreakBadge compact />
    </div>
  );
}
