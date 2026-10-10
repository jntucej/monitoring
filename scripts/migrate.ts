#!/usr/bin/env node
/**
 * Minimal migration runner.
 * - Reads .sql files from database/migrations/ and supabase/migrations/ in filename order
 * - Deduplicates by filename
 * - Records applied versions in schema_migrations
 * - Skips files already applied (by filename)
 * - Fails loudly if a previously-applied file's contents changed (checksum drift)
 *
 * Usage: npx tsx scripts/migrate.ts [--dry-run]
 */
import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";
import { join } from "path";
import * as fs from "fs";
import * as net from "net";

const rootDir = process.cwd();

// Load environment variables from .env
function loadEnvFile(filePath: string, override = false) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (match && (override || !process.env[match[1]])) {
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  }
}

// Load authoritative production .env first
loadEnvFile(join(rootDir, ".env"), true);

// Check if a TCP port is open locally
async function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Setup connection parameters for container or host
async function setupDatabaseConnection() {
  const localOpen = await isPortOpen("127.0.0.1", 5432);
  const targetHost = process.env.POSTGRES_HOST || (localOpen ? "127.0.0.1" : "172.19.0.3");
  
  const user = process.env.POSTGRES_USER || "postgres";
  const pass = process.env.POSTGRES_PASSWORD || "postgres";
  const db = process.env.POSTGRES_DB || "gate_monitor";
  const port = process.env.POSTGRES_PORT || "5432";

  // Build authoritative working connection string
  process.env.DATABASE_URL = `postgres://${user}:${encodeURIComponent(pass)}@${targetHost}:${port}/${db}`;
  process.env.POSTGRES_HOST = targetHost;
}

const DIRS = [
  "database/migrations",
];

const DRY = process.argv.includes("--dry-run");

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  await setupDatabaseConnection();
  const { getPostgresPool } = await import("../src/lib/postgres");
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    // 1. Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     TEXT PRIMARY KEY,
        filename    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum    TEXT NOT NULL
      )
    `);

    // 2. Fetch already applied migrations
    const res = await client.query<{ filename: string; checksum: string }>(
      "SELECT filename, checksum FROM schema_migrations"
    );
    const already = new Map(res.rows.map((r) => [r.filename, r.checksum]));

    // 3. Scan and deduplicate migration files
    const fileMap = new Map<string, { dir: string; name: string; path: string }>();

    for (const dir of DIRS) {
      const fullDir = join(rootDir, dir);
      const entries = await readdir(fullDir).catch(() => []);
      for (const name of entries) {
        if (name.endsWith(".sql") && !name.startsWith("_")) {
          if (!fileMap.has(name)) {
            fileMap.set(name, { dir, name, path: join(fullDir, name) });
          }
        }
      }
    }

    const files = Array.from(fileMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    let applied_count = 0;
    let skipped = 0;
    let drifted = 0;

    for (const f of files) {
      const sql = await readFile(f.path, "utf8");
      const sum = sha256(sql);
      const prev = already.get(f.name);

      if (prev === sum) {
        console.log(`✓ ${f.name} (already applied)`);
        skipped++;
        continue;
      }
      if (prev && prev !== sum) {
        console.error(`✗ ${f.name} — content changed since last apply (checksum drift). Aborting.`);
        drifted++;
        continue;
      }
      if (DRY) {
        console.log(`→ would apply ${f.name}`);
        continue;
      }

      console.log(`→ applying ${f.name} …`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        const version = f.name.replace(/_.*/, "");
        await client.query(
          "INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)",
          [version, f.name, sum]
        );
        await client.query("COMMIT");
        applied_count++;
        console.log(`✓ ${f.name} applied`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`✗ ${f.name} FAILED:`, err);
        process.exit(1);
      }
    }

    console.log(`\nDone. Applied: ${applied_count}, Skipped: ${skipped}, Drifted: ${drifted}`);
    if (drifted) process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
