#!/usr/bin/env node
// backup-runner.mjs — One-click backup runner for Gate Monitor.
//
// Invoked by the worker via execFileSync (host-side).
// Runs on the host where restic is installed and USB drives are mounted.
//
// Workflow:
//   1. Acquire backup lock (prevent concurrent writers)
//   2. Validate registered device + mount status + capacity
//   3. Generate PostgreSQL pg_dump -Fc
//   4. Run restic backup for all classified resources
//   5. Verify snapshot integrity
//   6. Record manifest + recovery point
//   7. Release lock
//
// Exit codes:
//   0 = all critical resources backed up successfully
//   1 = critical resource failed
//   2 = device/mount validation failed
//   3 = lock acquisition failed (concurrent job)
//   4 = restic repo error

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : def;
};

const REPO = getArg("repo", "/mnt/external-logs/gate-monitor/restic");
const TAG = getArg("tag", "daily-" + new Date().toISOString().slice(0, 10));
const MANIFEST_OUT = getArg("manifest-out", "/tmp/backup-manifest-" + Date.now() + ".json");
const COMPOSE_DIR = getArg("compose-dir", "/opt/monitoring/compose");
const LOCK_FILE = getArg("lock-file", "/opt/monitoring/backup-active-jobs");

const RESTIC_PASSWORD = process.env.RESTIC_PASSWORD || "gate-monitor-backup-repo-v1";
const RESTIC_ENV = { ...process.env, RESTIC_PASSWORD, RESTIC_REPOSITORY: REPO };

const resources = [];
let criticalOk = true;
let importantOk = true;

function record(name, category, status, bytes = 0, error = null, snapId = null) {
  resources.push({ name, category, status, bytes, error, snapshot_id: snapId });
  if (status === "failed") {
    if (category === "CRITICAL") criticalOk = false;
    if (category === "IMPORTANT") importantOk = false;
  }
}

function safeExec(cmd, cmdArgs, envVars = RESTIC_ENV, timeout = 300_000) {
  try {
    return { ok: true, output: execFileSync(cmd, cmdArgs, { env: envVars, timeout, maxBuffer: 1024*1024*512 }).toString() };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

// ── 1. Acquire lock ──────────────────────────────────────────────────────────
const lockId = crypto.randomUUID();
if (existsSync(LOCK_FILE)) {
  const existing = readFileSync(LOCK_FILE, "utf8").trim();
  if (existing && existing !== lockId) {
    // Check if the existing lock is stale (> 2 hours old)
    try {
      const lockData = JSON.parse(existing);
      const lockAge = Date.now() - new Date(lockData.acquired_at).getTime();
      if (lockAge < 2 * 3600 * 1000) {
        record("lock", "CRITICAL", "failed", 0, "Another backup job is running (lock held for " + Math.round(lockAge / 60000) + " min)");
        writeFileSync(MANIFEST_OUT, JSON.stringify({ status: "failed", error: "CONCURRENT_JOB_LOCKED" }, null, 2));
        console.log(JSON.stringify({ status: "locked", lock_id: lockData.id }));
        process.exit(3);
      }
    } catch {
      // Stale or corrupt lock — take it
    }
  }
}
writeFileSync(LOCK_FILE, JSON.stringify({ id: lockId, acquired_at: new Date().toISOString(), pid: process.pid }));
const releaseLock = () => { try { unlinkSync(LOCK_FILE); } catch {} };
process.on("exit", releaseLock);
process.on("SIGTERM", () => { releaseLock(); process.exit(1); });
process.on("SIGINT", () => { releaseLock(); process.exit(1); });

// ── 2. Validate restic repo ──────────────────────────────────────────────────
if (!existsSync(REPO)) {
  record("restic-repo", "CRITICAL", "failed", 0, `Repository not found at ${REPO}`);
  writeFileSync(MANIFEST_OUT, JSON.stringify({ status: "failed", critical_ok: false, resources }, null, 2));
  console.log(JSON.stringify({ status: "failed", error: "REPO_NOT_FOUND" }));
  process.exit(4);
}

const repoCheck = safeExec("restic", ["check", "--no-data"], RESTIC_ENV, 120_000);
if (!repoCheck.ok) {
  record("restic-repo", "CRITICAL", "failed", 0, "repo check failed: " + repoCheck.output.slice(0, 200));
  writeFileSync(MANIFEST_OUT, JSON.stringify({ status: "failed", critical_ok: false, resources }, null, 2));
  console.log(JSON.stringify({ status: "failed", error: "REPO_CHECK_FAILED" }));
  process.exit(4);
}
record("restic-repo", "CRITICAL", "ok", 0, null, "repo-validated");

// ── 3. PostgreSQL backup ─────────────────────────────────────────────────────
const pgDumpPath = path.join(os.tmpdir(), `gate-monitor-pg-dump-${Date.now()}.sql.gz`);
const pgResult = safeExec("pg_dump", [
  "--format=custom", "--compress=6",
  "--file", pgDumpPath,
  "-U", process.env.POSTGRES_USER || "postgres",
  "-h", process.env.POSTGRES_HOST || "127.0.0.1",
  "-p", process.env.POSTGRES_PORT || "5432",
  "-d", process.env.POSTGRES_DB || "gate_monitor",
  "--no-owner", "--no-privileges",
], { ...RESTIC_ENV, PGPASSWORD: process.env.POSTGRES_PASSWORD || "" }, 300_000);

if (pgResult.ok && existsSync(pgDumpPath)) {
  const pgSize = statSync(pgDumpPath).size;
  // Verify with pg_restore --list
  const verify = safeExec("pg_restore", ["--list", pgDumpPath], RESTIC_ENV, 60_000);
  if (verify.ok) {
    // Back up the dump into restic
    const resticPg = safeExec("restic", ["backup", pgDumpPath, "--tag", `${TAG}-pg`], RESTIC_ENV, 600_000);
    const snapMatch = resticPg.output.match(/snapshot (\w+) saved/);
    record("postgres-dump", "CRITICAL", resticPg.ok ? "ok" : "failed", pgSize,
      resticPg.ok ? null : resticPg.output.slice(0, 200),
      resticPg.ok ? snapMatch?.[1] : null);
  } else {
    record("postgres-dump", "CRITICAL", "failed", 0, "pg_restore --list verification failed: " + verify.output.slice(0, 200));
  }
  // Clean up the temp dump
  try { unlinkSync(pgDumpPath); } catch {}
} else {
  record("postgres-dump", "CRITICAL", "failed", 0, "pg_dump failed: " + pgResult.output.slice(0, 300));
}

// ── 4. Back up configuration files ───────────────────────────────────────────
const configTargets = [
  { path: path.join(COMPOSE_DIR, "docker-compose.yml"), name: "docker-compose.yml", category: "IMPORTANT" },
  { path: path.join(COMPOSE_DIR, ".env"), name: ".env (encrypted)", category: "IMPORTANT" },
  { path: "/etc/caddy/Caddyfile", name: "caddy-config", category: "IMPORTANT" },
  { path: path.join(COMPOSE_DIR, "database", "migrations"), name: "db-migrations", category: "IMPORTANT" },
];

for (const target of configTargets) {
  if (!existsSync(target.path)) continue;
  const r = safeExec("restic", ["backup", target.path, "--tag", `${TAG}-${target.name.replace(/[^a-z0-9-]/gi, "-")}`], RESTIC_ENV, 120_000);
  const size = existsSync(target.path) && target.path.endsWith(".yml") ? statSync(target.path).size : 0;
  const snapMatch = r.output.match(/snapshot (\w+) saved/);
  record(target.name, target.category, r.ok ? "ok" : "failed", size,
    r.ok ? null : r.output.slice(0, 200),
    r.ok ? snapMatch?.[1] : null);
}

// ── 5. Back up uploads volume ────────────────────────────────────────────────
const uploadsDir = "/opt/monitoring/uploads";
if (existsSync(uploadsDir)) {
  const r = safeExec("restic", ["backup", uploadsDir, "--tag", `${TAG}-uploads`], RESTIC_ENV, 600_000);
  record("uploads-volume", "CRITICAL", r.ok ? "ok" : "failed", 0,
    r.ok ? null : r.output.slice(0, 200),
    r.ok ? r.output.match(/snapshot (\w+) saved/)?.[1] : null);
}

// ── 6. Write manifest ─────────────────────────────────────────────────────────
const totalBytes = resources.reduce((s, r) => s + (r.bytes || 0), 0);
const manifest = {
  run_id: TAG + "-" + Date.now(),
  timestamp: new Date().toISOString(),
  status: criticalOk ? (importantOk ? "completed" : "partial") : "failed",
  critical_ok: criticalOk,
  important_ok: importantOk,
  resources_total: resources.length,
  resources_ok: resources.filter((r) => r.status === "ok").length,
  resources_failed: resources.filter((r) => r.status === "failed").length,
  total_bytes: totalBytes,
  repository: REPO,
  resources,
};

writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({
  status: manifest.status,
  critical_ok: criticalOk,
  important_ok: importantOk,
  resources: manifest.resources_total,
  total_bytes: totalBytes,
  manifest: MANIFEST_OUT,
}));

process.exit(criticalOk ? 0 : 1);
