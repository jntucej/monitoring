export { buildCustomGreeting } from "@/lib/custom-greeting";

export function computeAttendanceCushion(
  attended: number,
  total: number,
  thresholdPct = 75,
) {
  if (total <= 0) {
    return { pct: 100, safeSkips: 0, classesNeeded: 0, atRisk: false };
  }
  const pct = Math.round((attended / total) * 1000) / 10;
  const targetRatio = thresholdPct / 100;

  if (pct >= thresholdPct) {
    const maxExtraTotal = Math.floor(attended / targetRatio);
    const safeSkips = Math.max(0, maxExtraTotal - total);
    return { pct, safeSkips, classesNeeded: 0, atRisk: false };
  }

  const numerator = targetRatio * total - attended;
  const denominator = 1 - targetRatio;
  const classesNeeded = Math.max(1, Math.ceil(numerator / denominator));
  return { pct, safeSkips: 0, classesNeeded, atRisk: true };
}

export interface PeriodSlotLike {
  startTime: string;
  endTime?: string;
  status?: "scheduled" | "confirmed" | "cancelled" | "swapped" | "exam";
}

export function filterUpcomingPeriods<T extends PeriodSlotLike>(
  periods: T[],
  nowHHMM: string,
): T[] {
  return periods.filter((p) => {
    const cutoff = p.endTime || p.startTime;
    return !cutoff || cutoff > nowHHMM;
  });
}
