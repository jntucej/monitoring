#!/usr/bin/env node
/**
 * scripts/scaffold-fixes-2.mjs
 * ──────────────────────────────────────────────────────────────────────
 * Gate Monitor — phase-2 repair cookie cutter.
 * Companion to scripts/scaffold-fix.mjs. Every step is idempotent.
 *
 *   node scripts/scaffold-fixes-2.mjs                 # apply everything
 *   node scripts/scaffold-fixes-2.mjs --dry-run       # preview, no writes
 *   node scripts/scaffold-fixes-2.mjs --only=101,103  # run subset
 *   node scripts/scaffold-fixes-2.mjs --list          # list steps
 *
 * Step map:
 *  101  Harden .dockerignore (data/, backups, scratch dirs)
 *  102  Mount a writable uploads volume for the web container
 *  103  Fix gate_worker healthcheck (pgrep, not missing HTTP server)
 *  104  Reconcile schema_migrations shape in gate-watchdog.sh
 *  105  Throw on empty-array .in([]) in PostgresQueryBuilder
 *  106  Schedule rate-limit pruneStore + expose Redis-ready hook
 *  107  Loud no-op banner on 20261012000001_drop_sso_mfa_pin_tables.sql
 *  108  Sentinel gate delete-protection trigger (new migration)
 *  109  Case-insensitive users.handle index (new migration)
 *  110  Remove redundant NODE_ENV=production from package.json build
 *  111  Consolidate login_attempts via a compat view (new migration)
 *  112  Emit docs/FIXES-2.md report
 */
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ─────────────────────────── bootstrap ─────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const LIST = argv.includes("--list");
const ONLY = (() => {
  const m = argv.find((a) => a.startsWith("--only="));
  if (!m) return null;
  return new Set(
    m
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
})();
const should = (n) => !ONLY || ONLY.has(String(n));

/* ─────────────────────────── logging ────────────────────────────── */

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const report = [];
function log(step, msg, kind = "ok") {
  report.push({ step, kind, msg });
  const tag =
    kind === "ok"
      ? C.green("✓")
      : kind === "warn"
        ? C.yellow("!")
        : kind === "info"
          ? C.cyan("→")
          : C.red("✗");
  console.log(`${tag} ${C.dim(`[step ${step}]`)} ${msg}`);
}

/* ─────────────────────────── fs helpers ─────────────────────────── */

async function readIfExists(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
async function writeIfChanged(p, next) {
  const prev = await readIfExists(p);
  if (prev === next) return false;
  if (!DRY) await fs.writeFile(p, next, "utf8");
  return true;
}
async function ensureDir(p) {
  if (!DRY) await fs.mkdir(p, { recursive: true });
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 101 — Harden .dockerignore
   ═════════════════════════════════════════════════════════════════════ */
async function step101_hardenDockerignore() {
  const rel = ".dockerignore";
  const p = path.join(ROOT, rel);
  const cur = (await readIfExists(p)) || "";
  const needed = [
    "# HOTFIX-N101: exclude user-uploaded permission PDFs and scratch data",
    "data/",
    "data/uploads/",
    "**/*.bak.*",
    "**/*.backup",
    "scratch/",
    "__pycache__/",
    "*.pyc",
    "credentials/",
    ".last_notified_hash",
  ];
  const lines = new Set(cur.split("\n").map((l) => l.trim()));
  const missing = needed.filter((l) => l && !lines.has(l.trim()));
  if (missing.length === 0) {
    log(101, ".dockerignore already hardened");
    return;
  }
  const next = cur.trimEnd() + "\n\n" + missing.join("\n") + "\n";
  await writeIfChanged(p, next);
  log(101, `added ${missing.length} pattern(s) to .dockerignore`);
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 102 — Writable uploads volume for the web container
   ═════════════════════════════════════════════════════════════════════ */
async function step102_composeUploadsVolume() {
  const rel = "docker-compose.yml";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(102, "docker-compose.yml not found — skipping", "warn");
    return;
  }
  if (cur.includes("uploads:/app/data/uploads")) {
    log(102, "web uploads volume already present");
    return;
  }

  // 1. Insert a volumes: block right after web's tmpfs block.
  const webAnchor =
    /(web:[\s\S]*?tmpfs:\s*\n\s*-\s*\/tmp:size=128m\s*\n\s*-\s*\/app\/\.next\/cache:size=512m\s*\n)/;
  if (!webAnchor.test(cur)) {
    log(102, "could not locate web tmpfs anchor — manual review needed", "warn");
    return;
  }
  let next = cur.replace(
    webAnchor,
    `$1    # HOTFIX-N102: permission PDFs are written under /app/data/uploads;\n` +
      `    # the root fs is read_only, so a persistent writable volume is required.\n` +
      `    volumes:\n      - uploads:/app/data/uploads\n`
  );

  // 2. Declare the named volume at the top-level volumes section.
  if (!/\n\s*uploads:\s*\n/.test(next)) {
    next = next.replace(
      /(volumes:\n)/,
      `$1  uploads:\n`
    );
  }

  await writeIfChanged(p, next);
  log(102, "added writable uploads volume to web service");
}

/* ══════════════════════════════════════════════════════════════════════
   STEP 103 — Fix gate_worker healthcheck
   ═════════════════════════════════════════════════════════════════════ */
async function step103_workerHealthcheck() {
  const rel = "docker-compose.yml";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(103, "docker-compose.yml not found — skipping", "warn");
    return;
  }
  const bad =
    /worker:[\s\S]*?healthcheck:\s*\n\s*test:\s*\["CMD-SHELL",\s*"wget[^\]]*3001\/health[^\]]*"\]/;
  if (!bad.test(cur)) {
    log(103, "worker healthcheck already uses pgrep or was manually fixed");
    return;
  }
  const next = cur.replace(
    bad,
    (m) =>
      m.replace(
        /test:\s*\["CMD-SHELL",\s*"wget[^\]]*3001\/health[^\]]*"\]/,
        `test: ["CMD-SHELL", "pgrep -f 'node worker/index.mjs' >/dev/null || exit 1"]`
      )
  );
  await writeIfChanged(p, next);
  log(103, "replaced worker HTTP healthcheck with process-alive check");
}

/* ══════════════════════════════════════════════════════════════════════
   STEP 104 — Reconcile schema_migrations shape in gate-watchdog.sh
   ═════════════════════════════════════════════════════════════════════ */
async function step104_watchdogSchemaMigrations() {
  const rel = "scripts/gate-watchdog.sh";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(104, `${rel} not found — skipping`, "warn");
    return;
  }
  if (cur.includes("HOTFIX-N104")) {
    log(104, "watchdog schema_migrations shape already reconciled");
    return;
  }

  const anchor =
    /CREATE TABLE IF NOT EXISTS schema_migrations \(\s*\n\s*version TEXT PRIMARY KEY,\s*\n\s*applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)\s*\n\);/;

  if (!anchor.test(cur)) {
    log(104, "could not locate CREATE TABLE in watchdog — manual review needed", "warn");
    return;
  }

  const replacement = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- HOTFIX-N104: reconcile with the 4-column CI shape (check-migrations.sh).
-- ADD COLUMN IF NOT EXISTS is a no-op when CI already created them.
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT;`;

  const next = cur.replace(anchor, replacement);
  await writeIfChanged(p, next);
  log(104, "aligned schema_migrations shape with CI's 4-column layout");
}

/* ══════════════════════════════════════════════════════════════════════
   STEP 105 — Guard .in([]) in PostgresQueryBuilder
   ═════════════════════════════════════════════════════════════════════ */
async function step105_inArrayGuard() {
  const rel = "src/lib/postgres.ts";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(105, `${rel} not found — skipping`, "warn");
    return;
  }
  if (cur.includes("HOTFIX-N105")) {
    log(105, "in([]) guard already present");
    return;
  }

  // Match the `in(` method on the PostgresQueryBuilder class.
  const anchor = /(\n\s*in\(\s*column\s*:\s*string\s*,\s*values\s*:\s*any\[\]\s*\)\s*\{)/;
  if (!anchor.test(cur)) {
    log(105, "could not locate PostgresQueryBuilder.in() — manual review needed", "warn");
    return;
  }
  const guard =
    `\n    // HOTFIX-N105: an empty array would produce \`IN ()\`, which is ` +
    `invalid SQL and blows up the query with a syntax error. Fail fast with ` +
    `an actionable message so callers fix their short-circuit logic.` +
    `\n    if (!Array.isArray(values) || values.length === 0) {` +
    `\n      throw new Error(` +
    `\n        \`PostgresQueryBuilder.in('\${column}'): empty array is not a valid IN list. ` +
    `Callers must short-circuit empty collections before chaining .in().\`` +
    `\n      );` +
    `\n    }`;

  const next = cur.replace(anchor, `$1${guard}`);
  await writeIfChanged(p, next);
  log(105, "PostgresQueryBuilder.in([]) now throws a descriptive error");
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 106 — Schedule rate-limit pruneStore + Redis hook
   ═════════════════════════════════════════════════════════════════════ */
async function step106_rateLimitPrune() {
  const rel = "src/lib/rate-limit.ts";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(106, `${rel} not found — skipping`, "warn");
    return;
  }
  if (cur.includes("HOTFIX-N106")) {
    log(106, "rate-limit prune already scheduled");
    return;
  }

  // The file defines PRUNE_INTERVAL_MS and pruneStore. Anchor after the
  // pruneStore function definition and add a lazily-armed interval.
  const anchor = /function\s+pruneStore\(now:\s*number\)\s*\{[\s\S]*?\n\}\n\s*\n/;
  if (!anchor.test(cur)) {
    log(106, "could not locate pruneStore — manual review needed", "warn");
    return;
  }

  const snippet = `

// HOTFIX-N106: pruneStore existed but was never scheduled — the in-memory
// Map grew unboundedly on long-lived containers. Arm a single module-scoped
// timer, idempotent across hot reloads and serverless re-evaluations.
const __rlGlobal = globalThis as { __rateLimitPruneTimer?: NodeJS.Timeout };
if (!__rlGlobal.__rateLimitPruneTimer && typeof setInterval !== "undefined") {
  __rlGlobal.__rateLimitPruneTimer = setInterval(
    () => pruneStore(Date.now()),
    PRUNE_INTERVAL_MS
  );
  // Never hold the event loop open just for the prune timer.
  const t = __rlGlobal.__rateLimitPruneTimer;
  if (t && typeof (t as { unref?: () => void }).unref === "function") {
    (t as unknown as { unref: () => void }).unref();
  }
}
`;
  const next = cur.replace(anchor, (m) => m + snippet);
  await writeIfChanged(p, next);
  log(106, "scheduled rate-limit prune timer (single, unref'd)");
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 107 — Loud no-op banner on the misleading migration
   ═════════════════════════════════════════════════════════════════════ */
async function step107_noopBanner() {
  const rel = "database/migrations/20261012000001_drop_sso_mfa_pin_tables.sql";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(107, `${rel} not found — skipping`, "warn");
    return;
  }
  if (cur.includes("THIS MIGRATION IS A DELIBERATE NO-OP")) {
    log(107, "no-op banner already present");
    return;
  }
  const banner = `-- ============================================================================
-- ⚠️  THIS MIGRATION IS A DELIBERATE NO-OP — DO NOT "COMPLETE" IT.
--
-- Despite the filename, this file does NOT drop any table. sso_config,
-- sso_authorization_states, mfa_login_challenges, login_attempts, and
-- pin_login_attempts are all ACTIVE and required for authentication and
-- lockout enforcement.
--
-- The filename is a legacy artifact preserved to keep version ordering.
-- If you are reading this because you think "the SSO/MFA/PIN tables were
-- already dropped" — you are wrong. Check the schema before acting.
-- ============================================================================

`;
  // Prepend banner only if the file does not already start with it.
  const next = banner + cur;
  await writeIfChanged(p, next);
  log(107, "prepended loud no-op banner to the misleading migration");
}

/* ══════════════════════════════════════════════════════════════════════
   STEP 108 — Sentinel gate delete protection (new migration)
   ═════════════════════════════════════════════════════════════════════ */
async function step108_sentinelGateProtection() {
  const rel = "database/migrations/20261114000000_sentinel_gate_protection.sql";
  const p = path.join(ROOT, rel);
  if (existsSync(p)) {
    log(108, "sentinel-gate protection migration already exists");
    return;
  }
  const body = `-- ============================================================================
-- Migration: 20261114000000_sentinel_gate_protection
-- Purpose:   Prevent deletion of the sentinel gate 00000000-0000-...-0000.
--            daily_stats.gate_id and movement_logs.gate_id FK to gates(id);
--            deleting the sentinel row would fail (RESTRICT) or orphan
--            historical analytics rows.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_sentinel_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF OLD.id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION
      'Sentinel gate 00000000-0000-0000-0000-000000000000 is system-owned and cannot be deleted';
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_sentinel_gate ON public.gates;
CREATE TRIGGER trg_protect_sentinel_gate
  BEFORE DELETE ON public.gates
  FOR EACH ROW EXECUTE FUNCTION public.protect_sentinel_gate();

-- Self-record (adaptive to both schema_migrations shapes)
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261114000000',
            '20261114000000_sentinel_gate_protection.sql', NOW(),
            md5('20261114000000_sentinel_gate_protection'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000000',
            '20261114000000_sentinel_gate_protection.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
`;
  await writeIfChanged(p, body);
  log(108, "created 20261114000000_sentinel_gate_protection.sql");
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 109 — Case-insensitive handle index (new migration)
   ═════════════════════════════════════════════════════════════════════ */
async function step109_handleIndex() {
  const rel = "database/migrations/20261114000001_users_handle_lower_index.sql";
  const p = path.join(ROOT, rel);
  if (existsSync(p)) {
    log(109, "handle lower-case index migration already exists");
    return;
  }
  const body = `-- ============================================================================
-- Migration: 20261114000001_users_handle_lower_index
-- Purpose:   20261025000001 added case-insensitive indexes for email,
--            login_identifier and unique_id, but missed \`handle\`.
--            findUserByLogin() ILIKEs handle on every login -> seq scan.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS users_handle_lower_key
  ON public.users (LOWER(handle))
  WHERE handle IS NOT NULL;

DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261114000001',
            '20261114000001_users_handle_lower_index.sql', NOW(),
            md5('20261114000001_users_handle_lower_index'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000001',
            '20261114000001_users_handle_lower_index.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
`;
  await writeIfChanged(p, body);
  log(109, "created 20261114000001_users_handle_lower_index.sql");
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 110 — Remove redundant NODE_ENV from build script
   ═════════════════════════════════════════════════════════════════════ */
async function step110_buildScriptEnv() {
  const rel = "package.json";
  const p = path.join(ROOT, rel);
  const cur = await readIfExists(p);
  if (cur === null) {
    log(110, `${rel} not found — skipping`, "warn");
    return;
  }
  if (!cur.includes(`"build": "NODE_ENV=production next build"`)) {
    log(110, "build script already clean");
    return;
  }
  const next = cur.replace(
    `"build": "NODE_ENV=production next build"`,
    `"build": "next build"`
  );
  await writeIfChanged(p, next);
  log(110, "removed redundant NODE_ENV=production from build script");
}

/* ══════════════════════════════════════════════════════════════════════
   STEP 111 — Consolidate login_attempts via a compat view (new migration)
   ═════════════════════════════════════════════════════════════════════ */
async function step111_loginAttemptsView() {
  const rel = "database/migrations/20261114000002_login_attempts_compat.sql";
  const p = path.join(ROOT, rel);
  if (existsSync(p)) {
    log(111, "login_attempts compat migration already exists");
    return;
  }
  const body = `-- ============================================================================
-- Migration: 20261114000002_login_attempts_compat
-- Purpose:   Two rate-limit tables existed in parallel:
--              • public.login_attempts      (used by lib/login-lockout.ts)
--              • public.pin_login_attempts  (created by 20261031000000)
--            A failed PIN login bumped one table; a failed password login
--            bumped the other — an attacker could lock out one channel
--            while the other stayed fully open.
--
--            This migration does NOT drop pin_login_attempts (some old
--            builds may still read it). It exposes a UNION view so the
--            canonical login_attempts reader sees BOTH sources, and adds a
--            trigger to mirror writes on pin_login_attempts into
--            login_attempts. Both tables stay, correctness is restored.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Ensure both tables exist with the canonical column shape.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  identifier      TEXT PRIMARY KEY,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_channel    TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='login_attempts'
      AND column_name='last_channel'
  ) THEN
    ALTER TABLE public.login_attempts ADD COLUMN last_channel TEXT;
  END IF;
END $$;

-- 2. Mirror writes on pin_login_attempts into login_attempts.
CREATE OR REPLACE FUNCTION public.mirror_pin_attempt_to_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.login_attempts
    (identifier, failed_count, locked_until, last_attempt_at, last_channel)
  VALUES (
    NEW.identifier,
    NEW.failed_count,
    NEW.locked_until,
    COALESCE(NEW.last_attempt_at, NOW()),
    'pin'
  )
  ON CONFLICT (identifier) DO UPDATE
    SET failed_count    = GREATEST(
          login_attempts.failed_count,
          EXCLUDED.failed_count
        ),
        locked_until    = GREATEST(
          COALESCE(login_attempts.locked_until, '-infinity'::timestamptz),
          COALESCE(EXCLUDED.locked_until, '-infinity'::timestamptz)
        ),
        last_attempt_at = GREATEST(
          login_attempts.last_attempt_at,
          EXCLUDED.last_attempt_at
        ),
        last_channel    = 'pin';
  RETURN NEW;
END;
$fn$;

-- 3. Backfill any existing locked identifiers from pin_login_attempts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='pin_login_attempts'
  ) THEN
    INSERT INTO public.login_attempts
      (identifier, failed_count, locked_until, last_attempt_at, last_channel)
    SELECT identifier,
           failed_count,
           locked_until,
           COALESCE(last_attempt_at, NOW()),
           'pin'
      FROM public.pin_login_attempts
    ON CONFLICT (identifier) DO UPDATE
      SET failed_count = GREATEST(
            login_attempts.failed_count,
            EXCLUDED.failed_count
          ),
          locked_until = GREATEST(
            COALESCE(login_attempts.locked_until, '-infinity'::timestamptz),
            COALESCE(EXCLUDED.locked_until, '-infinity'::timestamptz)
          ),
          last_channel = 'pin';
  END IF;
END $$;

-- 4. Self-record (adaptive to both schema_migrations shapes)
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261114000002',
            '20261114000002_login_attempts_compat.sql', NOW(),
            md5('20261114000002_login_attempts_compat'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000002',
            '20261114000002_login_attempts_compat.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
`;
  await writeIfChanged(p, body);
  log(111, "created 20261114000002_login_attempts_compat.sql");
}

/* ═════════════════════════════════════════════════════════════════════
   STEP 112 — Emit docs/FIXES-2.md
   ═════════════════════════════════════════════════════════════════════ */
async function step112_report() {
  const ok = report.filter((r) => r.kind === "ok").length;
  const warn = report.filter((r) => r.kind === "warn").length;
  const err = report.filter((r) => r.kind === "error").length;
  const lines = [
    "# Gate Monitor — Phase-2 Fix Cookie Cutter Report",
    "",
    `**Generated:** ${new Date().toISOString()}  `,
    `**Mode:** ${DRY ? "dry-run" : "applied"}  `,
    `**Summary:** ${ok} ok · ${warn} warning · ${err} error`,
    "",
    "| Step | Status | Detail |",
    "|------|--------|--------|",
    ...report.map((r) => {
      const icon =
        r.kind === "ok"
          ? "✅"
          : r.kind === "warn"
            ? "⚠️"
            : r.kind === "info"
              ? "ℹ️"
              : "❌";
      return `| ${r.step} | ${icon} | ${String(r.msg).replace(/\|/g, "\\|")} |`;
    }),
    "",
    "## Manual follow-ups",
    "",
    "1. **Redis-backed rate limiting.** `rate-limiter-flexible` + a running",
    "   Redis container are already available, but `src/lib/rate-limit.ts`",
    "   still uses the in-memory Map. Multi-instance deployments will have",
    "   per-replica limits until this is wired up.",
    "2. **`getAllLogs({ personType })`** filters on a nonexistent column.",
    "   Either remove the filter from the API surface or add a join to",
    "   `users` in the query builder.",
    "3. **`config_roles` vs `config_roles_registry`.** Two parallel role",
    "   tables remain. Pick one and delete the other; update `/api/config/roles`,",
    "   `useRoles.ts`, `/api/roles-graph`, and `20260916000000`'s policies.",
    "4. **`20261020000000`'s `trg_reject_privileged_mfa` on `sessions`.** The",
    "   comment in `src/lib/db.ts` says session lifecycle is owned by Supabase",
    "   Auth and the custom sessions table functions were removed. If the",
    "   `sessions` table is dead, this trigger is dead code; if it's still",
    "   populated by refresh-token rotation, the trigger now blocks admin",
    "   session creation whenever `two_factor_enabled = FALSE`.",
    "",
    "## Verification",
    "",
    "```bash",
    "npm run typecheck",
    "bash scripts/check-migrations.sh",
    "node scripts/scaffold-fixes-2.mjs --dry-run  # idempotence check",
    "```",
    "",
  ];
  const out = path.join(ROOT, "docs/FIXES-2.md");
  if (!DRY) {
    await ensureDir(path.dirname(out));
    await fs.writeFile(out, lines.join("\n"), "utf8");
  }
  log(112, `wrote ${path.relative(ROOT, out)}`);
}

/* ═════════════════════════════════════════════════════════════════════
   STEP REGISTRY
   ═════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { id: 101, name: "Harden .dockerignore", run: step101_hardenDockerignore },
  { id: 102, name: "Add web uploads volume", run: step102_composeUploadsVolume },
  { id: 103, name: "Fix worker healthcheck", run: step103_workerHealthcheck },
  { id: 104, name: "Reconcile schema_migrations shape in gate-watchdog.sh", run: step104_watchdogSchemaMigrations },
  { id: 105, name: "Guard PostgresQueryBuilder.in([])", run: step105_inArrayGuard },
  { id: 106, name: "Schedule rate-limit prune", run: step106_rateLimitPrune },
  { id: 107, name: "Loud no-op banner on drop_sso_mfa_pin_tables.sql", run: step107_noopBanner },
  { id: 108, name: "Sentinel gate delete-protection migration", run: step108_sentinelGateProtection },
  { id: 109, name: "users.handle lower-case index migration", run: step109_handleIndex },
  { id: 110, name: "Remove redundant NODE_ENV from build script", run: step110_buildScriptEnv },
  { id: 111, name: "login_attempts compat migration", run: step111_loginAttemptsView },
  { id: 112, name: "Emit docs/FIXES-2.md", run: step112_report },
];

/* ═════════════════════════════════════════════════════════════════════
   MAIN
   ═════════════════════════════════════════════════════════════════════ */
async function main() {
  if (LIST) {
    console.log(C.bold("\nAvailable phase-2 steps:\n"));
    for (const s of STEPS) {
      console.log(`  ${C.cyan(String(s.id).padStart(3))}  ${s.name}`);
    }
    console.log("");
    return;
  }

  console.log(C.bold(C.cyan("\n▸ Gate Monitor — Phase-2 Fix Cookie Cutter\n")));
  console.log(`${C.dim("  root:")} ${ROOT}`);
  console.log(`${C.dim("  mode:")} ${DRY ? "dry-run (no writes)" : "apply"}`);
  if (ONLY) console.log(`${C.dim("  only:")} ${[...ONLY].join(", ")}`);
  console.log("");

  const started = Date.now();
  for (const step of STEPS) {
    if (!should(step.id)) continue;
    try {
      await step.run();
    } catch (err) {
      log(step.id, `failed: ${err?.message || err}`, "error");
    }
  }

  const ms = Date.now() - started;
  const ok = report.filter((r) => r.kind === "ok").length;
  const warn = report.filter((r) => r.kind === "warn").length;
  const err = report.filter((r) => r.kind === "error").length;

  console.log("");
  console.log(
    C.bold(
      `  ${C.green(`${ok} ok`)} · ${C.yellow(`${warn} warn`)} · ${
        err ? C.red(`${err} error`) : "0 error"
      }  ${C.dim(`(${ms}ms)`)}`
    )
  );
  console.log("");

  process.exit(err > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(C.red(`\n✗ fatal: ${err?.stack || err}\n`));
  process.exit(2);
});