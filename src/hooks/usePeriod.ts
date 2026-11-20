/**
 * usePeriod — hook that holds a Period and exposes setPeriod + helpers.
 * Pair with <PeriodPicker /> for the UI.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import { getPeriod, type Period, type PeriodKey } from "@/lib/period";

export interface UsePeriodResult {
  period: Period;
  setPeriod: (p: Period) => void;
  setPeriodKey: (key: PeriodKey) => void;
  /** ISO range strings ready to pass to API query params. */
  range: { from: string; to: string };
}

export function usePeriod(initialKey: PeriodKey = "this-month"): UsePeriodResult {
  const [period, setPeriod] = useState<Period>(() => getPeriod(initialKey));

  const setPeriodKey = useCallback((key: PeriodKey) => {
    setPeriod(getPeriod(key));
  }, []);

  const range = useMemo(() => ({ from: period.from, to: period.to }), [period]);

  return { period, setPeriod, setPeriodKey, range };
}

export default usePeriod;
