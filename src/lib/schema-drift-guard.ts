/**
 * Schema-drift guard.
 *
 * At startup (instrumentation hook) the web process walks every *.sql
 * migration file that ships inside the container, reads the live
 * `schema_migrations` table, and verifies that the highest recorded
 * version covers every committed file. If a migration file exists on
 * disk but was never applied to the database (the exact failure mode
 * behind the missing `gates.latitude` incident), the container logs a
 * loud, structured error so operators can spot it in their log tail
 * instead of waiting for a 500 at the gate.
 *
 * The guard is non-fatal by default: the app still boots so an
 * operator can reach the admin panel to run a manual repair. Set
 * `GATE_SCHEMA_DRIFT_STRICT=true` in the container env to make a
 * detected drift exit the process instead (good for CI / blue-green
 * deploys where a mismatched schema is a hard failure).
 *
 * File discovery
 * ---------------
 * The standalone build copies `database/migrations/*.sql` into
 * `/app/database/migrations/` (see Dockerfile COPY directive). The
 * directory name is stable across builds, so we resolve it relative
 * to `__dirname` first and fall back to a path next to CWD.
 */
import { readdir, stat } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

interface DriftReport {
  missing: string[];   // migration files whose version is NOT in schema_migrations
  total: number;       // total migration files on disk
  recorded: number;    // total versions in schema_migrations
}

let lastCheckAt: number | null = null;

/**
 * Resolve the on-disk migrations directory. Tries, in order:
 *   1. <repoRoot>/database/migrations   (dev + source checkout)
 *   2. /app/database/migrations         (standalone build inside the container)
 *   3. /app/.next/standalone/database/migrations  (if the builder left it in the tree)
 *
 * Returns the first directory that actually exists and contains at
 * least one `.sql` file.
 */
async function findMigrationsDir(): Promise<string | null> {
  const here = dirname(fileURLToPath(import.meta.url));

  const candidates: string[] = [];
  // src/lib -> repo root is two levels up in the source checkout.
  candidates.push(join(here, "..", "..", "database", "migrations"));
  candidates.push(join("/app", "database", "migrations"));
  candidates.push(join("/app", ".next", "standalone", "database", "migrations"));

  for (const p of candidates) {
    try {
      const st = await stat(p);
      if (!st.isDirectory()) continue;
      const files = await readdir(p);
      const hasSql = files.some((f) => f.endsWith(".sql"));
      if (hasSql) return p;
    } catch {
      /* not present, try next */
    }
  }
  return null;
}

async function listMigrationFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  // Only forward migrations participate in the version chain; skip
  // rollback files (they intentionally share a prefix with their
  // forward migration) and underscore-prefixed seed placeholders.
  return files
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !f.startsWith("_"))
    .filter((f) => !f.endsWith(".down.sql"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Check the live DB. Safe to call repeatedly — it short-circuits if a
 * check finished less than `minIntervalMs` ago.
 */
export async function checkSchemaDrift(minIntervalMs = 5 * 60 * 1000): Promise<DriftReport | null> {
  const now = Date.now();
  if (lastCheckAt !== null && now - lastCheckAt < minIntervalMs) {
    return null; // still warm, skip
  }

  const dir = await findMigrationsDir();
  if (!dir) {
    console.warn("[schema-drift] no migrations directory found on disk; skipping check");
    return null;
  }

  let files: string[];
  try {
    files = await listMigrationFiles(dir);
  } catch (err) {
    console.error("[schema-drift] failed to list migration files:", err);
    return null;
  }

  if (files.length === 0) {
    lastCheckAt = now;
    return { missing: [], total: 0, recorded: 0 };
  }

  // Lazy import so that client-side bundlers (and the browser build)
  // never pull in `pg` just because this module is referenced.
  const { getPostgresPool } = await import("./postgres");
  let pool;
  try {
    pool = await getPostgresPool();
  } catch (err) {
    console.error("[schema-drift] cannot connect to Postgres; skipping check:", (err as Error).message);
    return null;
  }

  const seen = new Set<string>();
  let recordedCount = 0;
  try {
    // The schema_migrations table has a `version` column that is the
    // numeric prefix of every migration filename (e.g. 20261027000001
    // for 20261027000001_gates_geo_columns.sql).
    const { rows } = await pool.query<{ version: string }>(
      "SELECT version FROM schema_migrations"
    );
    for (const r of rows) {
      seen.add(r.version);
      recordedCount += 1;
    }
  } catch (err: any) {
    if (err?.code === "42P01") {
      // schema_migrations table does not exist yet (fresh install).
      // Treat as "everything is missing" but do not crash.
      console.warn("[schema-drift] schema_migrations table does not exist yet; treating all migrations as missing");
    } else {
      console.error("[schema-drift] failed to read schema_migrations:", err?.message);
      return null;
    }
  }

  const missing: string[] = [];
  for (const f of files) {
    const version = f.slice(0, f.indexOf("_") > 0 ? f.indexOf("_") : undefined) || f;
    // Some files use a bare numeric prefix with no underscore
    // (e.g. "20261027000001_gates_geo_columns.sql" -> "20261027000001").
    const v = f.match(/^(\d+)/)?.[1];
    if (v && !seen.has(v)) missing.push(f);
  }

  lastCheckAt = now;

  if (missing.length > 0) {
    const strict = process.env.GATE_SCHEMA_DRIFT_STRICT === "true";
    const msg = `[schema-drift] ${missing.length} migration file(s) on disk are NOT recorded in schema_migrations: ${missing.join(", ")}. Apply them with: npx tsx scripts/migrate.ts (or: psql < <file> one by one).`;
    if (strict) {
      // Loud + hard fail in CI / blue-green.
      console.error(msg);
      console.error("[schema-drift] GATE_SCHEMA_DRIFT_STRICT=true; exiting.");
      process.exit(1);
    } else {
      console.error(msg);
    }
  } else {
    console.log(`[schema-drift] OK: ${files.length} migrations on disk, ${recordedCount} recorded versions, 0 missing.`);
  }

  return { missing, total: files.length, recorded: recordedCount };
}

/**
 * Intended to be invoked from src/instrumentation.ts register() on
 * server boot. Wrapped in a fire-and-forget so a check failure never
 * blocks the HTTP server from coming up.
 */
export function runSchemaDriftGuardOnBoot(): void {
  checkSchemaDrift()
    .then((report) => {
      if (!report) return;
      if (report.missing.length === 0 && report.total > 0) {
        console.log(`[schema-drift] startup check passed (${report.total} migrations, ${report.recorded} recorded).`);
      }
    })
    .catch((err) => {
      console.error("[schema-drift] startup check failed:", err);
    });
}
