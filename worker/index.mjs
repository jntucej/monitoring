import cron from 'node-cron';

console.log('[Worker] Starting background worker supervisor...');

cron.schedule('0 2 * * *', async () => {
  console.log('[Worker] Running scheduled job: backfill_daily_stats');
  try {
    const job = await import('./jobs/backfill_daily_stats.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] backfill_daily_stats failed:', err);
  }
});

cron.schedule('0 3 * * *', async () => {
  console.log('[Worker] Running scheduled job: cleanup_expired_passes');
  try {
    const job = await import('./jobs/cleanup_expired_passes.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] cleanup_expired_passes failed:', err);
  }
});

cron.schedule('0 4 * * 0', async () => {
  console.log('[Worker] Running scheduled job: audit_log_rotation');
  try {
    const job = await import('./jobs/audit_log_rotation.js');
    if (job.default) await job.default();
  } catch (err) {
    console.error('[Worker] audit_log_rotation failed:', err);
  }
});

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM, shutting down worker gracefully.');
  process.exit(0);
});
