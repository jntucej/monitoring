#!/usr/bin/env node
/**
 * H0201 sync bridge entrypoint.
 *
 * Polls the biometric terminal, resolves device_user_id -> Supabase users.id,
 * and writes to:
 *   1. public.movement_logs (primary)
 *   2. public.attendance_records (mirror)
 *
 * This file is only for development convenience. In production, run the
 * compiled worker with your preferred process manager.
 */

import { createClient } from '@supabase/supabase-js';
import { createMapper } from './mapper';
import {
  LogFetcher,
  createTcpLogFetcher,
  createTextFileLogFetcher,
  createBinaryFileLogFetcher,
} from './log-fetcher';
import { createSink } from './sink';
import { ResolvedDeviceEvent, SyncRunSnapshot } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DEVICE_SERIAL = process.env.BIOMETRIC_DEVICE_SERIAL || '1241920440010';
const DEVICE_HOST = process.env.BIOMETRIC_DEVICE_HOST || '192.168.1.201';
const DEVICE_PORT = Number(process.env.BIOMETRIC_DEVICE_PORT || 4370);
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 30000);
const TCP_TIMEOUT_MS = Number(process.env.BIOMETRIC_DEVICE_TCP_TIMEOUT_MS || 5000);
const DEVICE_TIMEZONE = (process.env.BIOMETRIC_DEVICE_TIMEZONE || '').trim() || undefined;

const USE_FAKE_DEVICE_LOGS = process.env.USE_FAKE_DEVICE_LOGS === 'true';
const USE_TCP = process.env.USE_TCP === 'true' || USE_FAKE_DEVICE_LOGS;
const TEXT_FILE_PATH = process.env.BIOMETRIC_TEXT_FILE_PATH || '';
const BINARY_FILE_PATH = process.env.BIOMETRIC_BINARY_FILE_PATH || '';
const BINARY_BLOCK_SIZE = Number(process.env.BIOMETRIC_BINARY_BLOCK_SIZE || 40);
const SOURCE_LABEL = process.env.BIOMETRIC_SOURCE_LABEL || 'h0201_tcp_pull';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[sync-bridge] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const mapper = createMapper({
  deviceSerial: DEVICE_SERIAL,
  deviceTimezone: DEVICE_TIMEZONE,
});

const sink = createSink({
  sourceLabel: SOURCE_LABEL,
  deviceSerial: DEVICE_SERIAL,
});
let fetcher: LogFetcher;

if (USE_TCP) {
  fetcher = createTcpLogFetcher({
    host: DEVICE_HOST,
    port: DEVICE_PORT,
    timeoutMs: TCP_TIMEOUT_MS,
  });
} else if (TEXT_FILE_PATH) {
  const fileFetcher = await createTextFileLogFetcher(TEXT_FILE_PATH);
  fetcher = fileFetcher;
} else if (BINARY_FILE_PATH) {
  const fileFetcher = await createBinaryFileLogFetcher(BINARY_FILE_PATH, BINARY_BLOCK_SIZE);
  fetcher = fileFetcher;
} else {
  console.error(
    '[sync-bridge] No log source configured. Set one of: USE_TCP/USE_FAKE_DEVICE_LOGS, BIOMETRIC_TEXT_FILE_PATH, BIOMETRIC_BINARY_FILE_PATH',
  );
  process.exit(1);
}



// ---------------------------------------------------------------------------
// Run loop
// ---------------------------------------------------------------------------
let shuttingDown = false;

async function runOnce(): Promise<void> {
  const startedAt = Date.now();
  const snapshot: SyncRunSnapshot = {
    startedAt,
    finishedAt: startedAt,
    rawCount: 0,
    resolvedCount: 0,
    skippedUnmappedCount: 0,
    movementLogInsertCount: 0,
    attendanceRecordUpsertCount: 0,
    attendanceRecordConflictCount: 0,
    errors: [],
  };

  try {
    const rawLogs = await fetcher.fetch();
    snapshot.rawCount = rawLogs.length;

    if (rawLogs.length === 0) {
      console.log(`[sync-bridge] no raw logs this cycle`);
      snapshot.finishedAt = Date.now();
      return;
    }

    let resolved: ResolvedDeviceEvent[];
    try {
      resolved = await mapper.resolve(rawLogs, supabase);
    } catch (err) {
      snapshot.errors.push(`mapper.resolve failed: ${err}`);
      snapshot.finishedAt = Date.now();
      logSnapshot(snapshot);
      return;
    }

    const unmappedProxy = rawLogs.length - resolved.length;
    snapshot.skippedUnmappedCount = Math.max(0, unmappedProxy);
    snapshot.resolvedCount = resolved.length;

    if (resolved.length === 0) {
      snapshot.finishedAt = Date.now();
      logSnapshot(snapshot);
      return;
    }

    const sinkResult = await sink.write(resolved, supabase);
    snapshot.movementLogInsertCount = sinkResult.movementLogInserted;
    snapshot.attendanceRecordUpsertCount = sinkResult.attendanceRecordUpserted;
    snapshot.attendanceRecordConflictCount = sinkResult.attendanceRecordConflicts;
    snapshot.errors.push(...sinkResult.movementLogErrors, ...sinkResult.attendanceRecordErrors);
  } catch (err) {
    snapshot.errors.push(`cycle failed: ${err}`);
  }

  snapshot.finishedAt = Date.now();
  logSnapshot(snapshot);
}

function logSnapshot(snapshot: SyncRunSnapshot): void {
  const duration = snapshot.finishedAt - snapshot.startedAt;
  const parts = [
    `[sync-bridge] ${new Date().toISOString()}`,
    `serial=${DEVICE_SERIAL}`,
    `raw=${snapshot.rawCount}`,
    `resolved=${snapshot.resolvedCount}`,
    `skipped_unmapped=${snapshot.skippedUnmappedCount}`,
    `movement_logs_inserted=${snapshot.movementLogInsertCount}`,
    `attendance_records_upserted=${snapshot.attendanceRecordUpsertCount}`,
    `attendance_records_conflicts=${snapshot.attendanceRecordConflictCount}`,
    `errors=${snapshot.errors.length}`,
    `elapsed_ms=${duration}`,
  ];

  if (snapshot.errors.length > 0) {
    parts.push('');
    for (const err of snapshot.errors.slice(0, 5)) {
      parts.push(`  - ${err}`);
    }
  }

  console.log(parts.join(' '));
}

async function waitForInterrupt(): Promise<void> {
  await new Promise<void>((resolve) => {
    const onSig = () => {
      shuttingDown = true;
      resolve();
    };
    process.on('SIGINT', onSig);
    process.on('SIGTERM', onSig);
  });
}

async function main(): Promise<void> {
  console.log(`[sync-bridge] starting serial=${DEVICE_SERIAL} interval_ms=${SYNC_INTERVAL_MS}`);

  runOnce();

  if (shuttingDown) {
    console.log('[sync-bridge] shutting down');
    return;
  }

  const timer = setInterval(() => {
    if (shuttingDown) {
      clearInterval(timer);
      console.log('[sync-bridge] shutting down');
      return;
    }
    runOnce();
  }, SYNC_INTERVAL_MS);

  await waitForInterrupt();
  clearInterval(timer);
}

main().catch((err) => {
  console.error('[sync-bridge] fatal:', err);
  process.exit(1);
});

export {};
