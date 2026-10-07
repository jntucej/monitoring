import { query } from '../db.js';

/**
 * Scheduled Job: Backfill Daily Gate Stats.
 * Aggregates movement_logs and scans into daily_stats table (date, gate_id).
 */
export default async function backfillDailyStats() {
  console.log('[Worker Job] Starting daily stats backfill...');

  try {
    // Upsert daily stats from movement_logs for the last 2 days to ensure midnight boundaries are covered
    const upsertQuery = `
      WITH agg AS (
        SELECT
          DATE(m.timestamp) as log_date,
          m.gate_id,
          COALESCE(g.name, m.gate_id::text) as gate_name,
          COUNT(*) FILTER (WHERE m.direction = 'entry') as total_entries,
          COUNT(*) FILTER (WHERE m.direction = 'exit') as total_exits,
          EXTRACT(HOUR FROM m.timestamp)::integer as hr,
          COUNT(*) as hr_count
        FROM movement_logs m
        LEFT JOIN gates g ON g.id = m.gate_id
        WHERE m.timestamp >= CURRENT_DATE - INTERVAL '2 days'
        GROUP BY DATE(m.timestamp), m.gate_id, g.name, EXTRACT(HOUR FROM m.timestamp)
      ),
      peak AS (
        SELECT DISTINCT ON (log_date, gate_id)
          log_date,
          gate_id,
          hr as peak_hour,
          hr_count as peak_count
        FROM agg
        ORDER BY log_date, gate_id, hr_count DESC
      ),
      totals AS (
        SELECT
          log_date,
          gate_id,
          gate_name,
          SUM(total_entries)::bigint as entries,
          SUM(total_exits)::bigint as exits
        FROM agg
        GROUP BY log_date, gate_id, gate_name
      )
      INSERT INTO daily_stats (
        date,
        gate_id,
        gate_code,
        entries,
        exits,
        peak_hour,
        peak_count,
        updated_at
      )
      SELECT
        t.log_date,
        t.gate_id,
        t.gate_name,
        t.entries,
        t.exits,
        p.peak_hour,
        p.peak_count,
        NOW()
      FROM totals t
      LEFT JOIN peak p ON p.log_date = t.log_date AND p.gate_id = t.gate_id
      ON CONFLICT (date, gate_id) DO UPDATE SET
        entries = EXCLUDED.entries,
        exits = EXCLUDED.exits,
        peak_hour = EXCLUDED.peak_hour,
        peak_count = EXCLUDED.peak_count,
        gate_code = EXCLUDED.gate_code,
        updated_at = NOW();
    `;

    const res = await query(upsertQuery);
    console.log(`[Worker Job] Successfully backfilled daily stats (${res.rowCount || 0} rows aggregated).`);
  } catch (err) {
    console.error('[Worker Job Error] Daily stats backfill failed:', err.message);
  }
}

