"use client";

import { useEffect } from "react";
import { useVPRetention } from "@/stores/vpRetentionStore";

/**
 * Runs on mount and every 5 minutes. If the current day is a workday and the
 * VP has made a decision AND has zero overdue items, the streak is bumped.
 * Bad days (any overdue) reset the streak.
 */
export function useVPStreak(zeroOverdue: boolean, pendingCount: number) {
  const bump = useVPRetention((s) => s.bumpStreakIfEligible);
  const resetToday = useVPRetention((s) => s.resetTodayIfNeeded);

  useEffect(() => {
    resetToday();
    bump(zeroOverdue);
    const id = setInterval(() => {
      resetToday();
      bump(zeroOverdue);
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [zeroOverdue, pendingCount, bump, resetToday]);
}
