## U1 Preflight (read-only, 2026-11-25)

All 6 checks pass. No changes made to production.

### 1. Actual migration history in PostgreSQL
- 303 migrations applied (last = 20270131000036, 2026-11-25 15:56 UTC)
- schema_migrations table is intact and ordered

### 2. Are 37–39 already applied?
- 20270131000037 (backup_and_maintenance_center): NOT in DB
- 20270131000038 (storage_devices_and_repos): NOT in DB
- 20270131000039 (usb_backup_hardening): NOT in DB
- All three exist as forward + .down files in database/migrations/

### 3. Down-migration safety & completeness
- 37.down: DROP TABLE IF EXISTS × 8 (all tables 37 created) ✓
- 38.down: DROP TABLE IF EXISTS × 3 ✓
- 39.down: DROP TABLE IF EXISTS × 3 + ALTER TABLE storage_devices DROP COLUMN IF EXISTS × 10 ✓
- No down-migration drops data from other migrations' tables
- FK references in 39 (registered_by → users, last_classified_by → users) are ON DELETE SET NULL — no cascade risk
- All forward migrations: 0 destructive DML, 16–17 IF NOT EXISTS / IF EXISTS tokens — safe to re-run

### 4. Isolated scratch database
- No persistent scratch container
- Pattern: `docker run --rm postgres:17` (throwaway, isolated from production)
- Validated: used in P6.5 (isolated restore) successfully
- For U1 rollback test: start scratch PG17 → restore production dump → run forward + down migrations on scratch only

### 5. Latest production backup restorable
- /opt/monitoring/backups/daily/pre-3f4874bf.dump (41 MB, 2026-11-25 20:36)
- restic snapshot 655bfa1d (precheck-db, 39.25 MiB, 2026-11-25 22:22) — latest
- Both verified: pg_restore --list succeeds, 2881 TOC entries, exit 0

### 6. Migration runner target
- scripts/migrate.ts connects to POSTGRES_HOST (set to `postgres` in compose)
- Uses POSTGRES_USER (postgres superuser, not gate_app) — required for CREATE ROLE in bootstrap
- Runs as gate_migrate one-shot service (restart: no, condition: service_completed_successfully)
- Advisory-lock guarded, idempotent — re-runs are safe

### Rollback test plan (scratch only, never production)
1. Start `docker run --rm --name gate-scratch-pg -e POSTGRES_PASSWORD=*** postgres:17`
2. Restore pre-3f4874bf.dump into scratch (or the precheck restic dump)
3. Apply forward: 37 → 38 → 39 on scratch
4. Apply down: 39.down → 38.down → 37.down on scratch
5. Verify: all 8+3+3 tables gone, 10 columns gone, 303 original migrations intact
6. Destroy scratch
7. Only then: apply forward 37→39 to production
