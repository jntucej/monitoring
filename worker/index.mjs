import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT ?? '3001', 10);
const HEALTH_STATE = {
  startedAt: Date.now(),
  lastJobAt: Date.now(),
  lastJobName: 'supervisor_init',
  jobsProcessed: 0,
};

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }
  if (req.url === '/status') {
    const age = Date.now() - HEALTH_STATE.lastJobAt;
    const stale = age > 60 * 60_000;
    res.writeHead(stale ? 503 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: stale ? 'stale' : 'healthy',
      uptime: Math.round((Date.now() - HEALTH_STATE.startedAt) / 1000),
      lastJob: HEALTH_STATE.lastJobName,
      lastJobAt: new Date(HEALTH_STATE.lastJobAt).toISOString(),
      jobsProcessed: HEALTH_STATE.jobsProcessed,
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

healthServer.listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`[Worker] Health check HTTP server listening on 0.0.0.0:${HEALTH_PORT}`);
});

console.log('[Worker] Starting background worker supervisor...');


cron.schedule('*/15 * * * *', async () => {
  console.log('[Worker] Running scheduled job: cleanup_ephemeral');
  try {
    const job = await import('./jobs/cleanup_ephemeral.js');
    if (job.default) await job.default();
    HEALTH_STATE.lastJobAt = Date.now();
    HEALTH_STATE.lastJobName = 'cleanup_ephemeral';
    HEALTH_STATE.jobsProcessed++;
  } catch (err) {
    console.error('[Worker] cleanup_ephemeral failed:', err);
  }
});

cron.schedule('0 2 * * *', async () => {
  console.log('[Worker] Running scheduled job: backfill_daily_stats');
  try {
    const job = await import('./jobs/backfill_daily_stats.js');
    if (job.default) await job.default();
    HEALTH_STATE.lastJobAt = Date.now();
    HEALTH_STATE.lastJobName = 'backfill_daily_stats';
    HEALTH_STATE.jobsProcessed++;
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

let bridgeRestartAttempts = 0;
const INITIAL_RESTART_DELAY_MS = 5000;
const MAX_RESTART_DELAY_MS = 60000;
let restartTimeout = null;
let activeBridgeChild = null;

function scheduleBridgeRestart(reason) {
  if (restartTimeout) return;
  bridgeRestartAttempts++;
  const delay = Math.min(
    INITIAL_RESTART_DELAY_MS * Math.pow(2, Math.max(0, bridgeRestartAttempts - 1)),
    MAX_RESTART_DELAY_MS
  );
  console.warn(`[Worker] sync-bridge ${reason}. Restarting in ${Math.round(delay / 1000)}s (attempt ${bridgeRestartAttempts})...`);
  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    startSyncBridge();
  }, delay);
}

function startSyncBridge() {
  const bridgePath = path.resolve(__dirname, '../scripts/sync-bridge/index.ts');
  if (!fs.existsSync(bridgePath)) {
    console.log('[Worker] sync-bridge script not found at', bridgePath, '- skipping bridge spawn.');
    return;
  }

  if (process.env.ENABLE_SYNC_BRIDGE === 'false') {
    console.log('[Worker] ENABLE_SYNC_BRIDGE=false - sync-bridge disabled.');
    return;
  }

  console.log(`[Worker] Spawning sync-bridge script: ${bridgePath}`);

  const isWin = process.platform === 'win32';
  const child = spawn(isWin ? 'npx.cmd' : 'npx', ['tsx', bridgePath], {
    stdio: 'inherit',
    env: process.env,
    shell: isWin,
  });
  activeBridgeChild = child;

  // Reset backoff counter if child process runs cleanly for >= 30 seconds
  const stableRunTimer = setTimeout(() => {
    bridgeRestartAttempts = 0;
  }, 30000);

  child.on('exit', (code, signal) => {
    clearTimeout(stableRunTimer);
    activeBridgeChild = null;
    scheduleBridgeRestart(`exited with code ${code}, signal ${signal}`);
  });

  child.on('error', (err) => {
    clearTimeout(stableRunTimer);
    activeBridgeChild = null;
    console.error('[Worker] sync-bridge spawn error:', err);
    scheduleBridgeRestart(`spawn error: ${err?.message || err}`);
  });
}

if (process.env.ENABLE_SYNC_BRIDGE === 'true') {
  startSyncBridge();
}

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM, shutting down worker gracefully.');
  if (restartTimeout) clearTimeout(restartTimeout);
  if (activeBridgeChild) {
    try { activeBridgeChild.kill('SIGTERM'); } catch { /* ignore */ }
  }
  process.exit(0);
});

