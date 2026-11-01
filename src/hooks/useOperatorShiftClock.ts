"use client";

// Operator shift clock: an operator's 8-hour shift is derived from their
// first recorded scan today (the desk is always on; the clock is not a
// separate login ritual). start = first scan, end = start + 8h. When no
// scan exists yet today, start/end are null and the caller shows the live
// time instead.

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export type OperatorShift = {
  start: Date | null;
  end: Date | null;
  /** Hours remaining on the shift; null when no active shift. */
  remainingHours: number | null;
};

export function useOperatorShiftClock(): OperatorShift {
  const [shift, setShift] = useState<OperatorShift>({
    start: null,
    end: null,
    remainingHours: null,
  });

  useEffect(() => {
    let cancelled = false;

    const derive = (firstScanIso: string | null) => {
      if (!firstScanIso) {
        setShift({ start: null, end: null, remainingHours: null });
        return;
      }
      const start = new Date(firstScanIso);
      const end = new Date(start.getTime() + 8 * 3_600_000);
      setShift({ start, end, remainingHours: null });
    };

    const load = () => {
      fetch("/api/operator/last-scan", {
        cache: "no-store",
        headers: getAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (cancelled) return;
          // Shift derives from the FIRST scan today: last-scan of the new day
          // (no earlier scan returned) is that first scan; a mid-day first scan
          // is the start of the window we derive the 8h from.
          const row = json?.data ?? null;
          derive(typeof row?.at === "string" ? row.at : null);
        })
        .catch(() => {
          if (!cancelled) derive(null);
        });
    };

    load();
    const poll = setInterval(load, 60_000);

    // Keep "remaining hours" fresh while the shift is live.
    const tick = setInterval(() => {
      setShift((s) => {
        if (!s.start || !s.end) return s;
        const ms = s.end.getTime() - Date.now();
        return { ...s, remainingHours: ms > 0 ? Math.max(0, ms / 3_600_000) : 0 };
      });
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  return shift;
}
