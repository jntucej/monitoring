"use client";

import { useEffect } from "react";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";

export function usePrincipalStreak(zeroOverdue: boolean, pendingCount: number) {
  const bump = usePrincipalRetention((s) => s.bumpStreakIfEligible);
  const resetToday = usePrincipalRetention((s) => s.resetTodayIfNeeded);

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
