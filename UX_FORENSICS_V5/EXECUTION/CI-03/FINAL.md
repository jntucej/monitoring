# CI-03 — Duplicate Migration Prefix `20270129000010`

- **Issue ID:** CI-03
- **Severity:** HIGH
- **Priority:** P1
- **Status:** VERIFIED

## Original Failure
`bash scripts/check-migrations.sh` failed:
`ERROR: Duplicate version prefix '20270129000010' detected: '20270129000010_vp_flags.sql' and '20270129000010_mess_eligibility.sql'`

## Root Cause
Both `20270129000010_vp_flags.sql` and `20270129000010_mess_eligibility.sql` shared the `20270129000010` version prefix. `vp_flags.sql` explicitly records `'20270129000010_vp_flags.sql'` in `schema_migrations`.

## Fix
Renamed `database/migrations/20270129000010_mess_eligibility.sql` to `database/migrations/20270129000011_mess_eligibility.sql`.

## Verification & Backtrack
- `bash scripts/check-migrations.sh`: PASS (`SUCCESS: Replayed all 237 migrations cleanly with zero errors.`)
