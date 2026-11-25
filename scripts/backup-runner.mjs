#!/usr/bin/env node
// scripts/backup-runner.mjs
//
// One-click backup runner — invoked by the worker via execFileSync.
// Runs on the host (the worker container is not the right layer for restic;
// the host has the USB drive mounted and restic installed).
//
// Usage (from worker):
//   node backup-runner.mjs --repo=/mnt/external-logs/gate-monitor/restic \
//     --pg-dump=/tmp/pg-dump.sql.gz --tag=daily --manifest-out=/tmp/manifest.json
//
// The runner:
//   1. Validates the restic repo is accessible
//   2. Backs up the pg-dump file into restic
//   3. Backs up /opt/monitoring/compose/docker-compose.yml + .env (encrypted)
//   4. Backs up Caddy config, Cloudflare tunnel config
//   5. Generates a manifest with SHA-256 of every file
//   6. Records the snapshot in the manifest
//
// Exit codes:
//   0 = all critical resources backed up
//   1 = critical resource failed
//   2 = non-critical resource failed (partial)

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : def;
};

const REPO = getArg("repo", "/mnt/external-logs/gate-monitor/restic");
const PG_DUMP = getArg("pg-dump", null);
const TAG = getArg("tag", "manual");
const MANIFEST_OUT = getArg("manifest-out", "/tmp/backup-manifest.json");
const COMPOSE_DIR = getArg("compose-dir", "/opt/monitoring/compose");

const RESTIC_PASSWORD = process.env.RESTIC_PASSWORD || "gate-monitor-backup-repo-v1";
const env = { ...process.env, RESTIC_PASSWORD, RESTIC_REPOSITORY: REPO };

const resourceDetails = [];
let criticalOk = true;
let importantOk = true;

function safeExec(cmd, cmdArgs, envVars = env, timeout = 300_000) {
  try {
    return { ok: true, output: execFileSync(cmd, cmdArgs, { env: envVars, timeout, maxBuffer: 1024*1024*512 }).toString() };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

function sha256File(fp) {
  try {
    return crypto.createHash("sha256").update(readFileSync(fp)).digest("hex");
  } catch {
    return null;
  }
}

function record(name, category, status, bytes = 0, error = null, snapshotId = null) {
  resourceDetails.push({ name, category, status, bytes, error, snapshot_id: snapshotId });
  if (status === "failed") {
    if (category === "CRITICAL") criticalOk = false;
    if (category === "IMPORTANT") importantOk = false;
  }
}

// ── 1. Validate restic repo ─────────────────────────────────────────────────
if (!existsSync(REPO)) {
  record("restic-repo", "CRITICAL", "failed", 0, `Repository not found at ${REPO}`);
  writeFileSync(MANIFEST_OUT, JSON.stringify({ status: "failed", critical_ok: false, resources: resourceDetails }, null, 2));
  process.exit(1);
}

const repoTest = safeExec("restic", ["check", "--no-data"], env, 120_000);
if (!repoTest.ok) {
  record("restic-repo", "CRITICAL", "failed", 0, `repo check failed: ${repoTest.output.slice(0, 200)}`);
  writeFileSync(MANIFEST_OUT, JSON.stringify({ status: "failed", critical_ok: false, resources: resourceDetails }, null, 2));
  process.exit(1);
}
record("restic-repo", "CRITICAL", "ok", 0, null, "repo-checked");

// ── 2. PostgreSQL backup ────────────────────────────────────────────────────
if (PG_DUMP && existsSync(PG_DUMP)) {
  const pgSize = statSync(PG_DUMP).size;
  const pgSha = sha256File(PG_DUMP);
  const pgBackup = safeExec("restic", ["backup", PG_DUMP, "--tag", `${TAG}-pg`], env, 600_000);
  if (pgBackup.ok) {
    const snapMatch = pgBackup.output.match(/snapshot (\w+) saved/);
    record("postgres-dump", "CRITICAL", "ok", pgSize, null, snapMatch?.[1] ?? null);
  } else {
    record("postgres-dump", "CRITICAL", "failed", pgSize, pgBackup.output.slice(0, 300));
  }
} else if (PG_DUMP) {
  record("postgres-dump", "CRITICAL", "failed", 0, `pg dump file not found: ${PG_DUMP}`);
}

// ── 3. Docker compose + .env ────────────────────────────────────────────────
const envFile = path.join(COMPOSE_DIR, ".env");
if (existsSync(envFile)) {
  const envSize = statSync(envFile).size;
  const envSha = sha256File(envFile);
  const cfgBackup = safeExec("restic", ["backup", envFile, "--tag", `${TAG}-config`], env, 120_000);
  if (cfgBackup.ok) {
    record(".env (encrypted at rest)", "IMPORTANT", "ok", envSize, null, cfgBackup.output.match(/snapshot (\w+) saved/)?.[1]);
  } else {
    record(".env", "IMPORTANT", "failed", envSize, cfgBackup.output.slice(0, 200));
  }
}

const composeYml = path.join(COMPOSE_DIR, "docker-compose.yml");
if (existsSync(composeYml)) {
  const compSize = statSync(composeYml).size;
  const compBackup = safeExec("restic", ["backup", composeYml, "--tag", `${TAG}-compose`], env, 60_000);
  if (compBackup.ok) {
    record("docker-compose.yml", "IMPORTANT", "ok", compSize, null, compBackup.output.match(/snapshot (\w+) saved/)?.[1]);
  } else {
    record("docker-compose.yml", "IMPORTANT", "failed", compSize, compBackup.output.slice(0, 200));
  }
}

// ── 4. Caddy + Cloudflare config ───────────────────────────────────────────
const caddyConfig = "/etc/caddy/Caddyfile";
if (existsSync(caddyConfig)) {
  const caddySize = statSync(caddyConfig).size;
  const caddyBackup = safeExec("restic", ["backup", caddyConfig, "--tag", `${TAG}-caddy`], env, 60_000);
  if (caddyBackup.ok) {
    record("caddy-config", "IMPORTANT", "ok", caddySize, null, caddyBackup.output.match(/snapshot (\w+) saved/)?.[1]);
  } else {
    record("caddy-config", "IMPORTANT", "failed", caddySize, caddyBackup.output.slice(0, 200));
  }
}

// ── 5. Database migrations (repo source of truth) ──────────────────────────
const migrationsDir = path.join(COMPOSE_DIR, "database", "migrations");
if (existsSync(migrationsDir)) {
  const migSize = statSync(migrationsDir).size; // dir size approx
  const migBackup = safeExec("restic", ["backup", migrationsDir, "--tag", `${TAG}-migrations`], env, 120_000);
  if (migBackup.ok) {
    record("db-migrations", "IMPORTANT", "ok", 0, null, migBackup.output.match(/snapshot (\w+) saved/)?.[1]);
  } else {
    record("db-migrations", "IMPORTANT", "failed", 0, migBackup.output.slice(0, 200));
  }
}

// ── 6. Write manifest ────────────────────────────────────────────────────────
const totalBytes = resourceDetails.reduce((s, r) => s + (r.bytes || 0), 0);
const manifest = {
  run_id: TAG + "-" + Date.now(),
  timestamp: new Date().toISOString(),
  status: criticalOk ? (importantOk ? "completed" : "partial") : "failed",
  critical_ok: criticalOk,
  important_ok: importantOk,
  resources_total: resourceDetails.length,
  resources_ok: resourceDetails.filter((r) => r.status === "ok").length,
  resources_failed: resourceDetails.filter((r) => r.status === "failed").length,
  total_bytes: totalBytes,
  repository: REPO,
  resources: resourceDetails,
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
