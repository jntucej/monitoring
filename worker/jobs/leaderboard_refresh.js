// worker/jobs/leaderboard_refresh.js
import { getWorkerDbPool } from "../db.js";

export async function runLeaderboardRefresh() {
  const pool = getWorkerDbPool();
  await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY public.class_leaderboards`);
  return { refreshed: true };
}
