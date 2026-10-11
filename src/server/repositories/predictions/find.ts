import { query } from "@/lib/postgres";

export interface PredictionRow {
  type: string;
  target: string;
  predicted_value: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  timestamp: string;
  model_version: string;
}

export async function findPredictions(type?: string): Promise<PredictionRow[]> {
  let sql = `SELECT * FROM predictions ORDER BY timestamp DESC LIMIT 30`;
  let params: any[] = [];
  if (type) {
    sql = `SELECT * FROM predictions WHERE type = $1 ORDER BY timestamp DESC LIMIT 30`;
    params = [type];
  }
  const { rows } = await query<PredictionRow>(sql, params);
  return rows;
}
