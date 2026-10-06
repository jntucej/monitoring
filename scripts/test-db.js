/**
 * Self-Hosted PostgreSQL Database Connectivity & Verification Script
 */

const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[match[1]] = val;
    }
  }
}

const rootDir = path.resolve(__dirname, "..");
loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

async function testDatabase() {
  console.log("🔍 Testing PostgreSQL Database Connectivity...");

  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || "postgres"}:${encodeURIComponent(
      process.env.POSTGRES_PASSWORD || "postgres"
    )}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${
      process.env.POSTGRES_DB || "gate_monitor"
    }`;

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    const res = await pool.query("SELECT NOW() as current_time, current_database() as db_name, version() as pg_version;");
    console.log("✅ PostgreSQL Connection Successful!");
    console.log(`   - Connected to database: ${res.rows[0].db_name}`);
    console.log(`   - Server time: ${res.rows[0].current_time}`);
    console.log(`   - Version: ${res.rows[0].pg_version.split(",")[0]}`);

    // Check key tables
    const tableRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
    );
    console.log(`\n📋 Found ${tableRes.rows.length} public tables:`);
    console.log(`   ${tableRes.rows.map((r) => r.table_name).join(", ")}`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ PostgreSQL Connection Failed:", err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

testDatabase();
