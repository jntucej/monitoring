#!/bin/bash
# L3 probe: gate_app must be able to write through RLS into audit_logs.
# Run from the host: bash scripts/l3-write-probe.sh
# Uses the worker container's DATABASE_URL + node_modules/pg.
set -euo pipefail
# Write the probe to a temp file (avoids shell-escaping $1 in the SQL)
docker exec -w /app gate_worker sh -c 'cat > /tmp/l3probe.js <<'"'"'JSEOF'"'"'
const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  await p.query("BEGIN");
  const ins = await p.query(
    "INSERT INTO audit_logs (id, action, details) VALUES (gen_random_uuid(), $1, ${'{}'}::jsonb) RETURNING 1 AS ok",
    ["RECOVERY_PROBE"]
  );
  await p.query("ROLLBACK");
  console.log("L3 gate_app write probe:", ins.rows[0].ok === 1 ? "WRITE_OK" : "FAILED");
  await p.end();
})().catch((e) => {
  console.log("L3 FAILED:", e.message);
  process.exit(1);
});
JSEOF
node /tmp/l3probe.js'
