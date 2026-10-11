import { query } from "@/lib/postgres";
import type { DailyGateStats } from "@/lib/types";

export async function findByDate(
  date: string,
  gateId?: string,
): Promise<DailyGateStats | null> {
  const cols = `
    date,
    gate_id         AS "gateId",
    gate_code       AS "gateCode",
    entries,
    exits,
    peak_hour       AS "peakHour",
    peak_count      AS "peakCount",
    on_campus_last  AS "onCampusLast",
    updated_at      AS "updatedAt"
  `;

  const sql = gateId
    ? `SELECT ${cols} FROM daily_stats WHERE date = $1 AND gate_id = $2`
    : `SELECT ${cols} FROM daily_stats WHERE date = $1`;

  const params = gateId ? [date, gateId] : [date];
  const { rows } = await query<DailyGateStats>(sql, params);
  return rows[0] ?? null;
}
