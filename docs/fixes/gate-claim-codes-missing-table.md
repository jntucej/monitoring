# Fix: "relation public.gate_claim_codes does not exist" on /sysadmin/gates

## Root cause
The sysadmin gates page's "Gate-Claim Codes" panel calls
`/api/supervisor/claim-codes`, which reads/writes the `public.gate_claim_codes`
table. That table is created by migration
`database/migrations/20261226000001_gate_claim_codes.sql`, but on
monitor.ucej.in the migration was never applied to the live database.
`/sysadmin/gates` is otherwise fine — the 500 is purely a missing table.

## Verification
```sql
-- on the live DB: 0 rows = table missing (the bug)
SELECT COUNT(*) FROM information_schema.tables
 WHERE table_schema='public' AND table_name='gate_claim_codes';

-- on the live DB: after the fix, 1 row = healthy
SELECT COUNT(*) FROM information_schema.tables
 WHERE table_schema='public' AND table_name='gate_claim_codes';
```

## Fix
1. **Fresh deploys** — the table DDL is now also in `database/schema.sql`
   (added in this fix), so `db-bootstrap.sh` (fresh DB) creates it.
2. **Live monitor.ucej.in** — apply the unapplied migration with the
   project's own runner (advisory-lock protected, records into
   `schema_migrations`, skips already-applied files):
   ```
   cd /opt/monitoring   # wherever the deploy lives on the box
   npx tsx scripts/migrate.ts
   ```
   Expected output includes:
   ```
   → applying 20261226000001_gate_claim_codes.sql …
   ```
   Then re-test: on `/sysadmin/gates` click "Generate 6-digit code" —
   the code appears and "ACTIVE CODES (1)" lists it.
   The operator-side claim flow (`/api/operator/claim-gate`) works with no
   other change.

## Why the runner is safe to run against a live DB
- `scripts/migrate.ts` takes `pg_advisory_lock(7243981)` — no concurrent runs.
- It skips any migration whose version + checksum is already recorded in
  `schema_migrations`, so already-applied files are never re-run.
- `20261226000001` is idempotent (`CREATE TABLE IF NOT EXISTS` +
  `CREATE INDEX IF NOT EXISTS`), so even a re-run is harmless.
