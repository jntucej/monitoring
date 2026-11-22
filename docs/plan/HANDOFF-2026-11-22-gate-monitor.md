# SESSION HANDOFF — Gate Monitor (JNTUH UCEJ) — 2026-11-22

Read this first to resume. Nothing below needs re-deriving.

## Where the system is
- Repo: /opt/monitoring/compose (branch main, was 22 behind origin; now PULLED to
  40ee7975 = the 22-commit "institutional" program: PR-01..15, Entity Inspection,
  universal shell chrome, EXAM_BRANCH seed fixes).
- Running: gate_web = monitoring-web:latest built 22:00 (from 40ee7975), **Up healthy**,
  /api/health 200, schema-drift 236/267 0-drift. Postgres/redis/prom/etc all healthy.
- **NOT deployed / not pushed**: nothing beyond the local pull. No new build after 22:00.
  Any further deploy/merge is HELD pending the user.

## Done this session (verified, raw output)
1. Fixed the login-500: it was Postgres credential drift (gate_app + postgres role
   passwords != the .env / web DATABASE_URL). Repaired via the trusted 127.0.0.1 loopback
   (gate_postgres) ALTER ROLE. Login now 200; 0 "password authentication failed" in logs.
2. Pulled + built + migrated + recreated web with the 22-commit program.
   - Found & fixed a real bug: scripts/migrate.ts was picking up *.down.sql rollback
     files as forward migrations (regex ^\d{14}_ matched them) -> 42601 crash.
     Added `!name.endsWith(".down.sql")`. Now 3 new forward migrations apply clean.
3. Fixed the demo-account password drift: 7 demo roles (faculty/guardian/operator/
   staff/student/visitor/worker) had bcrypt password_hash re-stamped; re-seeded 9 accounts
   (incl. 3 student) to bcryptjs(cost=10) of /root/monitoring/scripts/smoke-creds.json.
   All 7 now log in 200.
4. Role audit: 388-pair. First run = 297 clean / 91 login-failed (all the demo-cred ones,
   0 real UI breakage). Re-audit RUNNING (bg job) to confirm 388/388 after the reset.

## Pending / open (in this order for next steps)
- [ ] #1 Re-audit result (bg job notifies). Expect 388/388. If any REAL (non-login)
       breakage appears, that's the actual front-end defect to chase.
- [ ] #2 COMMIT the migrate.ts fix. It's STAGED now. The working tree ALSO has
       scripts/role-health-report.json (a tracked audit artifact) modified — do NOT commit
       that until the re-audit rewrites it (else you commit a stale report). Commit only
       scripts/migrate.ts + the two new docs (below) + the refreshed report, on its own
       branch per the protocol (dedicated branch, not main). Do NOT push until user says.
- [ ] Principal Frontend Transformation (pasted protocol #4): scoped in
       docs/plan/principal-frontend-transformation-TRACKER.md — 8 PRs (Stage A shared
       contract -> B1..B4 surfaces -> C redirects -> D retention -> E visual). NOT
       started. It's "new PRs" the user will assign. Deploy+merge are user-gated.

## New docs written (untracked)
- docs/quality/CREDENTIAL_DRIFT_RUNBOOK.md  (detect + repair the credential drift; read-only
  diagnosis commands; write steps marked [WRITE] for reference)
- docs/plan/principal-frontend-transformation-TRACKER.md  (the Principal FE PR tracker)

## Hard rules for the next journey
- Deploy/merge = user-only. "Do not deploy until I say" is still in force.
- PR lifecycle: inspect->reuse->contract->one-stage->tests->typecheck->lint->inspect UI->
  failure+permission tests->evidence->open PR->WAIT for merge auth. Never autonomous merge.
- No new npm deps. No file > 400 lines. Pages stay thin projections (no business logic).
- .env <-> container <-> DB three-way secret sync is the recurring trip point; after any
  password-policy/seed commit, re-run the audit and re-sync demo creds if roles start 401'ing.

## Quick commands
- Audit:  npx tsx scripts/verify-all-roles.ts      (~15min, writes scripts/role-health-report.json)
- Health: docker exec gate_caddy wget -qO- http://localhost:80/api/health
- Web logs: docker logs gate_web --tail 40
- Demo login (student): roll 23JJ1A0599 / student123
