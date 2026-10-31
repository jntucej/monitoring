"use client";

import { useEffect } from "react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

/**
 * On mount and every 5 minutes, checks whether the current shift ID matches
 * the one stored in the retention store. If not, it's a new shift — reset
 * shift-scoped state.
 *
 * shiftId = a stable string computed from the shift start time
 * (e.g., "2026-10-31-morning" or "2026-10-31-06-00").
 */
export function useSupervisorShift(input: {
  shiftId: string | null;
  shiftStartedAt: string | null;
  shiftEndsAt: string | null;
}) {
  const beginShift = useSupervisorRetention((s) => s.beginShift);

  useEffect(() => {
    if (!input.shiftId || !input.shiftStartedAt) return;
    beginShift(input.shiftId, input.shiftStartedAt, input.shiftEndsAt);
    const id = setInterval(() => {
      beginShift(input.shiftId!, input.shiftStartedAt!, input.shiftEndsAt);
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [input.shiftId, input.shiftStartedAt, input.shiftEndsAt, beginShift]);
}
