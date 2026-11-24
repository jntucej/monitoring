# GLOBAL_QUEUE.md — V5 Dynamic Implementation Queue

| ID | Title | Category | Severity | Priority | Role | Page / Scope | Root Cause Status | Implementation Status | Verification Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| CI-01 | 16 state-changing API routes missing CSRF control | Security/API | CRITICAL | P0 | all | `src/app/api/**` | VERIFIED | VERIFIED | VERIFIED | Closed (`withMutationGuard` applied to all 16 routes) |
| CI-02 | `attendance_disputes` RLS table missing `gate_app` SELECT policy | Security/DB | HIGH | P0 | student/faculty | `database/migrations/` | PENDING | READY | PENDING | Inspect `attendance_disputes` schema & add `gate_app` SELECT policy |
| CI-03 | Duplicate migration prefix `20270129000010` | DB/CI | HIGH | P1 | system | `database/migrations/` | PENDING | READY | PENDING | Inspect both migrations & renumber safely |
| TEST-01 | `nav-snapshots.test.ts` 3 failing day-scholar nav tests | UI/Nav | MEDIUM | P1 | student | `tests/unit/nav-snapshots.test.ts` | PENDING | READY | PENDING | Trace day-scholar nav visibility vs fixture expectations |
| TEST-02 | `test:gate:node` 3 suites fail on `import.meta.url` in `auth-token.ts` | Test/Auth | MEDIUM | P2 | all | `src/lib/auth-token.ts` | PENDING | READY | PENDING | Inspect `auth-token.ts:17` & Jest CJS compatibility |
| F-AD-04 | Bulk user import/export UI | UX/Feature | LOW | P3 | admin | `/admin/users` | VERIFIED | ALREADY_FIXED | VERIFIED | Closed |
| F-HOD-03 | 15s TTL on approval queue | UX/Perf | LOW | P3 | hod | `/hod/approvals` | VERIFIED | VERIFIED | VERIFIED | Closed (`fa4da8d1`) |
| V45-33 | 33 V4.5 findings already resolved | Various | — | — | all | — | VERIFIED | VERIFIED | VERIFIED | Closed in V4.5-AFX |
