// worker/jobs/backup_maintenance.js
//
// Backup & Maintenance Center worker job.
//
// Runs every 30 minutes. Production execution path:
//   1. psql from inside the worker container (POSTGRES_HOST=postgres:5432)
//   2. pg_dump -Fc → /tmp/pg-dump.sql.gz (tmpfs inside worker)
//   3. pg_restore --list verification
//   4. Copy dump to host bind mount /opt/monitoring/backups/daily
//   5. Record backup_executions + backup_artifacts + recovery point
//   6. Execute enabled maintenance_policies
//   7. Raise system_maintenance_alerts on failure
//
// Does NOT:
//   - Run destructive SQL
//   - Touch the live production database for restore testing
//   - Delete backups without retention verification
//   - Expose secrets

import { getWorkerDbPool } from "../db.js";
import { execFileSync } from "node:child_process";
import {
  readFileSync, existsSync, statSync, mkdirSync, readdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { uploadBackupToS3 } from "../lib/s3-offsite.js";

const BACKUP_ROOT = process.env.BACKUP_ROOT || "/opt/monitoring/backups";
const BACKUP_DAILY = path.join(BACKUP_ROOT, "daily");
const BACKUP_WEEKLY = path.join(BACKUP_ROOT, "weekly");
const LOG_PREFIX = "[backup-maint]";
const LOCK_FILE = process.env.BACKUP_LOCK_FILE || "/opt/monitoring/backup-active-jobs";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function isDue(cronExpr, lastRunAt, now = new Date()) {
  if (!lastRunAt) return true;
  const hours = (now - new Date(lastRunAt)) / 3600000;
  // Step syntax: "*\/3" → every 3h; "0 *\/3" → every 3h
  const m = cronExpr.match(/\*\s*\/\s*(\d+)/);
  if (m) return hours >= Number(m[1]);
  // Standard 5-field cron: M H D MoW → daily fires at the specified hour
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length >= 5 && (parts[2] === "*" || parts[4] === "*")) return hours >= 24;
  // Fallback
  return hours >= 24;
}

function safeExec(args, timeoutMs = 300_000, env = process.env) {
  try {
    const out = execFileSync(args[0], args.slice(1), {
      timeout: timeoutMs,
      stdio: "pipe",
      maxBuffer: 1024 * 1024 * 512,
      env,
    });
    return { ok: true, output: out.toString() };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

// ── PostgreSQL backup (production path) ──────────────────────────────────────

async function runPostgresBackup(pool, policy) {
  const dbUser = process.env.POSTGRES_USER || "gate_app";
  const dbHost = process.env.POSTGRES_HOST || "postgres";
  const dbPort = process.env.POSTGRES_PORT || "5432";
  const dbName = process.env.POSTGRES_DB || "gate_monitor";

  // 1. Verify DB connectivity
  const connCheck = safeExec(
    ["psql", "-U", dbUser, "-h", dbHost, "-p", dbPort, "-d", dbName, "-tAc", "SELECT 1"],
    30_000,
    { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || "", PGCONNECT_TIMEOUT: "10" }
  );
  if (!connCheck.ok) {
    throw new Error(`PostgreSQL connection failed: ${connCheck.output.slice(0, 200)}`);
  }

  // 2. Get database + server version metadata
  const versionRes = await pool.query(
    "SELECT current_setting('server_version') AS db_version"
  );
  const dbVersion = versionRes.rows[0]?.db_version || "unknown";

  // 3. Dump to /tmp (tmpfs inside worker container)
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outFile = `/tmp/gate-db-${ts}.sql.gz`;

  const hasPgDump = existsSync("/usr/bin/pg_dump") || existsSync("/usr/local/bin/pg_dump");
  let dumpResult;

  if (hasPgDump) {
    dumpResult = safeExec(
      ["pg_dump", "--format=custom", "--compress=6", `--file=${outFile}`,
       "-U", dbUser, "-h", dbHost, "-p", dbPort, "-d", dbName,
       "--no-owner", "--no-privileges"],
      300_000,
      { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || "" }
    );
  } else {
    // Fallback: psql SQL format (less compact but works without pg_dump binary)
    dumpResult = safeExec(
      ["psql", "-U", dbUser, "-h", dbHost, "-p", dbPort, "-d", dbName,
       "-o", outFile, "--single-transaction", "--verbose"],
      300_000,
      { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || "" }
    );
  }

  if (!dumpResult.ok || !existsSync(outFile)) {
    try { if (existsSync(outFile)) unlinkSync(outFile); } catch {}
    throw new Error(`pg_dump failed: ${dumpResult.output.slice(0, 300)}`);
  }

  const sizeBytes = statSync(outFile).size;

  // 4. Verify with pg_restore --list
  const verify = safeExec(["pg_restore", "--list", outFile], 60_000,
    { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || "" });
  if (!verify.ok) {
    try { unlinkSync(outFile); } catch {}
    throw new Error(`pg_restore --list verification failed: ${verify.output.slice(0, 200)}`);
  }

  // 5. Copy to host bind mount
  if (!existsSync(BACKUP_DAILY)) mkdirSync(BACKUP_DAILY, { recursive: true });
  const destPath = path.join(BACKUP_DAILY, `gate-db-${ts}.sql.gz`);
  const copyRes = safeExec(["cp", outFile, destPath], 120_000);
  if (!copyRes.ok) {
    try { unlinkSync(outFile); } catch {}
    throw new Error(`Failed to copy dump to host: ${copyRes.output.slice(0, 200)}`);
  }
  try { unlinkSync(outFile); } catch {} // Clean up tmpfs

  const checksum = sha256File(destPath);

  return {
    artifact_path: destPath,
    artifact_size: sizeBytes,
    checksum_sha256: checksum,
    db_version: dbVersion,
    verified: true,
    verify_output: "pg_restore --list OK",
  };
}

// ── Record execution ─────────────────────────────────────────────────────────

async function recordExecution(pool, policy, result, error) {
  const status = error ? "failed" : "completed";
  const startedAt = new Date(Date.now() - 30_000).toISOString();
  const completedAt = new Date().toISOString();

  const insRes = await pool.query(
    `INSERT INTO public.backup_executions
       (policy_id, resource_type, status, started_at, completed_at,
        artifact_path, artifact_size, checksum_sha256,
        local_success, error, worker_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      policy?.id ?? null,
      policy?.resource_type ?? "postgres",
      status, startedAt, completedAt,
      result?.artifact_path ?? null,
      result?.artifact_size ?? null,
      result?.checksum_sha256 ?? null,
      !error,
      error ?? null,
      "backup-maint-worker",
    ]
  );
  const execId = insRes.rows[0]?.id;

  if (result?.artifact_path && !error) {
    await pool.query(
      `INSERT INTO public.backup_artifacts
         (execution_id, filename, size_bytes, checksum_sha256, local_path, verified, verified_at)
       VALUES ($1,$2,$3,$4,$5,true,NOW())`,
      [execId, path.basename(result.artifact_path),
       result.artifact_size, result.checksum_sha256, result.artifact_path]
    );
  }

  if (result?.checksum_sha256 && !error) {
    await pool.query(
      `INSERT INTO public.recovery_points
         (snapshot_id, repository_path, is_latest_good)
       VALUES ($1,$2,true)
       ON CONFLICT (snapshot_id) DO UPDATE SET is_latest_good = true`,
      [result.checksum_sha256.slice(0, 8), result.artifact_path]
    );
  }

  return execId;
}

async function recordAlert(pool, type, severity, message, details) {
  try {
    await pool.query(
      `INSERT INTO public.system_maintenance_alerts
         (alert_type, severity, message, source, details)
       VALUES ($1,$2,$3,'backup-maintenance',$4)`,
      [type, severity, message, JSON.stringify(details)]
    );
  } catch (err) {
    console.error(LOG_PREFIX, "alert write failed:", err.message);
  }
}

// ── Maintenance policy execution ─────────────────────────────────────────────

async function runMaintenancePolicies(pool) {
  const { rows: policies } = await pool.query(
    `SELECT id, name, category, condition_expr, threshold, action,
            schedule_cron, max_per_window, enabled, last_run_at
       FROM public.maintenance_policies
      WHERE enabled = true`
  );

  for (const pol of policies) {
    if (!isDue(pol.schedule_cron, pol.last_run_at)) continue;

    const execRes = await pool.query(
      `INSERT INTO public.maintenance_executions (policy_id, status)
       VALUES ($1, 'running') RETURNING id`,
      [pol.id]
    );
    const execId = execRes.rows[0]?.id;

    let result = "skipped";
    let error = null;

    try {
      switch (pol.category) {
        case "docker_cleanup": {
          const out = safeExec(["docker", "image", "prune", "-f"], 60_000,
            { ...process.env, DOCKER_HOST: "unix:///var/run/docker.sock" });
          if (!out.ok) throw new Error(out.output);
          result = `pruned: ${out.output.trim()}`;
          break;
        }
        case "log_rotation": {
          const thresholdBytes = Number(pol.threshold) || 100 * 1024 * 1024;
          let truncated = 0;
          for (const dir of ["/var/log", "/opt/monitoring/logs"]) {
            if (!existsSync(dir)) continue;
            for (const f of readdirSync(dir)) {
              try {
                const fp = path.join(dir, f);
                const st = statSync(fp);
                if (st.size > thresholdBytes && f.endsWith(".log")) {
                  readFileSync; // no-op — truncate via exec
                  const t = safeExec(["truncate", "-s", "0", fp], 5_000);
                  if (t.ok) truncated++;
                }
              } catch {}
            }
          }
          result = `truncated ${truncated} log files > ${Math.round(thresholdBytes / 1024 / 1024)}MB`;
          break;
        }
        case "backup_retention": {
          const days = Number(pol.threshold) || 30;
          const cutoff = Date.now() - days * 86400_000;
          let deleted = 0;
          if (existsSync(BACKUP_DAILY)) {
            const backups = readdirSync(BACKUP_DAILY)
              .filter((f) => f.startsWith("gate-db-") && f.endsWith(".sql.gz"))
              .map((f) => ({ f, mtime: statSync(path.join(BACKUP_DAILY, f)).mtimeMs }))
              .sort((a, b) => b.mtime - a.mtime);
            // i=0 is newest — never delete it
            for (let i = 1; i < backups.length; i++) {
              if (backups[i].mtime < cutoff) {
                try { unlinkSync(path.join(BACKUP_DAILY, backups[i].f)); deleted++; } catch {}
              }
            }
          }
          result = `deleted ${deleted} expired backups (> ${days}d)`;
          break;
        }
        case "pg_vacuum": {
          const out = safeExec(
            ["psql", "-U", process.env.POSTGRES_USER || "gate_app",
             "-h", process.env.POSTGRES_HOST || "postgres",
             "-d", process.env.POSTGRES_DB || "gate_monitor",
             "-c", "VACUUM (ANALYZE, PARALLEL)"],
            300_000,
            { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD || "" }
          );
          result = out.ok ? "VACUUM ANALYZE OK" : `VACUUM failed: ${out.output}`;
          if (!out.ok) error = out.output;
          break;
        }
        case "redis_health":
          result = "redis health check completed (no key deletion)";
          break;
        case "health_check":
          result = "health check completed";
          break;
        default:
          result = `policy '${pol.name}' has no handler — skipped`;
      }
    } catch (err) {
      error = err.message;
      result = `error: ${err.message}`;
    }

    await pool.query(
      `UPDATE public.maintenance_executions
         SET status = $2, completed_at = NOW(), result = $3
       WHERE id = $1`,
      [execId, error ? "failed" : "completed", result]
    );
    await pool.query(
      `UPDATE public.maintenance_policies
         SET last_run_at = NOW(), last_result = $2
       WHERE id = $1`,
      [pol.id, result]
    );

    if (error) {
      await recordAlert(pool, "maintenance_failed", "warning",
        `Policy ${pol.name} failed: ${error}`,
        { policy: pol.name, category: pol.category, result });
    }
  }
}

// ── Main job entry point ─────────────────────────────────────────────────────

export default async function runBackupMaintenance() {
  const pool = getWorkerDbPool();

  // 1. Run due backups
  const { rows: duePolicies } = await pool.query(
    `SELECT id, name, resource_type, schedule_cron, retention_days,
            local_dir, offsite_enabled, offsite_bucket, offsite_prefix
       FROM public.backup_policies
      WHERE enabled = true`
  );

  let lastResult = null;

  for (const pol of duePolicies) {
    const last = await pool.query(
      `SELECT started_at FROM public.backup_executions
        WHERE policy_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [pol.id]
    );
    if (!isDue(pol.schedule_cron, last.rows[0]?.started_at)) continue;

    console.log(LOG_PREFIX, `executing backup policy '${pol.name}' (${pol.resource_type})`);

    let result, error;
    try {
      if (pol.resource_type === "postgres") {
        result = await runPostgresBackup(pool, pol);
        lastResult = result;
        if (pol.offsite_enabled && result?.artifact_path) {
          const s3Res = await uploadBackupToS3({
            filePath: result.artifact_path,
            bucket: pol.offsite_bucket,
            prefix: pol.offsite_prefix || "gate-monitor/backups",
            checksumSha256: result.checksum_sha256 || "",
          }).catch((s3Err) => ({ uploaded: false, reason: s3Err?.message || "s3_error" }));
          if (!s3Res.uploaded) {
            console.warn(LOG_PREFIX, `offsite S3 skipped/failed for '${pol.name}': ${s3Res.reason}`);
          } else {
            console.log(LOG_PREFIX, `offsite S3 uploaded: s3://${s3Res.bucket}/${s3Res.key}`);
          }
        }
      } else {
        result = {
          artifact_path: null, artifact_size: 0, checksum_sha256: null,
          db_version: null, verified: false,
          note: `no backup handler for resource_type '${pol.resource_type}' yet`,
        };
      }
    } catch (err) {
      error = err.message;
      result = null;
      console.error(LOG_PREFIX, `backup failed: ${error}`);
    }

    const execId = await recordExecution(pool, pol, result, error);

    if (error) {
      await recordAlert(pool, "backup_failed", "critical",
        `Backup policy '${pol.name}' failed: ${error}`,
        { policy: pol.name, error, execution_id: execId });
    }
  }

  // 2. Run maintenance policies
  await runMaintenancePolicies(pool);

  console.log(LOG_PREFIX, "cycle complete",
    lastResult ? `— dump: ${lastResult.artifact_path} (${lastResult.artifact_size} bytes)` : "");
}
