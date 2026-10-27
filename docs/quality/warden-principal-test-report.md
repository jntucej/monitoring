# Warden → Principal Consolidation — Test Report

Test results record for the warden→principal consolidation. Full inventory and
migration details: see `docs/quality/warden-principal-consolidation-audit.md`
(audit doc). Execution & rollback steps: see
`docs/quality/warden-principal-migration-plan.md`.

## 1. Test Environment

- Working tree: `/root/monitoring`
- Production: `/opt/monitoring/compose`
- Framework: Next.js App Router
- Database: PostgreSQL via Supabase pool

## 2. Static Checks

- `npx tsc --noEmit` → 0 errors.
- `node scripts/verify-layering.js` → "OK: no layering violations."

## 3. Unit Tests

- `npm run test:unit` → "92 PASSED, 0 FAILED", exit 0.
- The 21-role wiring check and the register/exit-flow invariant self-checks
  all passed.

## 4. Lint (changed files only)

- `npx eslint <changed files>` → 0 errors.
- 6 pre-existing warnings in `UserRolesPanel.tsx` (setState-in-effect /
  missing-dep) — pre-existing, NOT introduced by this change.

## 5. Database Verification (post-migration live check)

- 0 users with `role='warden'`.
- `config_roles_registry` warden row `is_active=false`.
- `config_exit_reasons.approval_by` values now `('none','principal')`.
- 1 former-warden user now `role='hostel_manager'` with `assigned_hostel`
  preserved.

## 6. Residual / Out-of-Scope References

Known, intentional, left as-is:

- Narrative "warden" copy in help / guardian / hostel-manager / student pages
  (describes the warden as a person, not the role).
- `warden_or_principal` workflow stage string (historical identifier).
- `is_warden()` / `get_warden_hostel()` deprecation shims (kept for legacy
  callers).
- `/warden/profile` → `/profile` legacy redirect in `next.config.mjs`.
- Playwright E2E specs not re-run in this pass (they require SMOKE_USER /
  SMOKE_PASS and a running browser) — flagged for the next E2E run.

## 7. Conclusion

All static + unit + layering + DB checks green; the consolidation is safe to
deploy. Residual items are non-blocking.
