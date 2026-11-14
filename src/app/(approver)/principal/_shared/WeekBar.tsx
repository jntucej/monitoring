"use client";

import { usePrincipalRetention } from "@/stores/principalRetentionStore";
import { StreakBadge } from "../_retention/StreakBadge";

export function WeekBar() {
  const session = usePrincipalRetention((s) => s.sessionDecisions);
  const today = usePrincipalRetention((s) => s.todayWins.length);

  return (
    <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 bg-bg-elevated/50 px-3 py-2 text-xs">
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
