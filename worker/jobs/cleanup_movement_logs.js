import { query } from '../db.js';

/**
 * Scheduled Job: Movement Logs Retention and Archival.
 * Purges raw movement_logs beyond the configured retention period (default: 365 days / 1 year),
 * since historical trends and audit summaries are preserved in daily_stats and audit_logs.
 */
export default async function cleanupMovementLogs() {
  console.log('[Worker Job] Starting movement logs retention cleanup...');
  const retentionDays = parseInt(process.env.MOVEMENT_LOGS_RETENTION_DAYS || '365', 10);

  try {
    const res = await query(
      `DELETE FROM public.movement_logs
        WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    console.log(`[Worker Job] Purged ${res.rowCount || 0} movement logs older than ${retentionDays} days.`);
  } catch (err) {
    console.error('[Worker Job] Error cleaning up movement logs:', err);
    throw err;
  }
}
