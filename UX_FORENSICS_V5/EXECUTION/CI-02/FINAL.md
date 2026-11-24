# CI-02 — `attendance_disputes` RLS Table Missing `gate_app` SELECT Policy

- **Issue ID:** CI-02
- **Severity:** HIGH
- **Priority:** P0
- **Status:** VERIFIED

## Original Failure
`bash scripts/check-gate-app-read-set.sh` failed:
`FAIL: 1 RLS-enabled table(s) lack a gate_app SELECT policy (silent-zero-row risk): attendance_disputes`

## Root Cause
`database/migrations/20270116000002_attendance_disputes.sql` enabled RLS on `public.attendance_disputes` and created policies only `TO authenticated`, omitting `TO gate_app`.

## Fix
Added `database/migrations/20270131000002_attendance_disputes_gate_app_rls.sql` (and `.down.sql`) creating `attendance_disputes_gate_app_all` (`FOR ALL TO gate_app USING (true) WITH CHECK (true)`), and applied it to `gate_postgres`.

## Verification & Backtrack
- `bash scripts/check-gate-app-read-set.sh`: PASS (`PASS: gate_app has a SELECT/ALL policy on every RLS-enabled public table.`)
- `bash scripts/check-rls-enforcement.sh`: PASS (7/7 checks)
