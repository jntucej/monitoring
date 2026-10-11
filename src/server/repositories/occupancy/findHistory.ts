import { query } from "@/lib/postgres";

export interface OccupancyHistoryRow {
  snapshot_at: string;
  inside_count: number;
}

export async function findHistory(hours = 24): Promise<OccupancyHistoryRow[]> {
  const { rows } = await query<OccupancyHistoryRow>(
    `SELECT date_trunc("hour", timestamp) AS snapshot_at,
            count(*) FILTER (WHERE direction = "IN")
              - count(*) FILTER (WHERE direction = "OUT") AS inside_count
       FROM movement_logs
      WHERE timestamp >= now() - ($1 || " hours")::interval
      GROUP BY 1
      ORDER BY 1 ASC`,
    [String(hours)],
  );
  return rows;
}
