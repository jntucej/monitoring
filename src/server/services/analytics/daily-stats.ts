import { findByDate } from "@/server/repositories/daily-stats/findByDate";
import { getIstDateString } from "@/server/policy/dates";

export interface DailyStatsInput {
  date?: string;
  gateId?: string;
}

export async function getDailyStats(input: DailyStatsInput) {
  const date = input.date ?? getIstDateString();
  const stats = await findByDate(date, input.gateId);
  return { date, stats };
}
