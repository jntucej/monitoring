# CI-01 — 16 State-Changing API Routes Missing CSRF Control

- **Issue ID:** CI-01
- **Severity:** CRITICAL
- **Priority:** P0
- **Status:** VERIFIED

## Original Failure
`bash scripts/check-csrf-coverage.sh` failed with 16 `CSRF MISSING` routes:
- `src/app/api/academic-automation/route.ts`
- `src/app/api/actions/route.ts`
- `src/app/api/campus/events/[id]/feedback/route.ts`
- `src/app/api/class-coordinators/route.ts`
- `src/app/api/class-level-issues/[id]/resolve/route.ts`
- `src/app/api/class-level-issues/route.ts`
- `src/app/api/class-messages/[id]/release/route.ts`
- `src/app/api/class-messages/route.ts`
- `src/app/api/class-requests/[id]/resolve/route.ts`
- `src/app/api/class-requests/route.ts`
- `src/app/api/class-sessions/[sessionId]/review/route.ts`
- `src/app/api/disputes/route.ts`
- `src/app/api/operator/scans/[id]/category/route.ts`
- `src/app/api/passes/[passId]/feedback/route.ts`
- `src/app/api/student/attendance/dispute/route.ts`
- `src/app/api/sysadmin/autonomous-monitoring/route.ts`

## Root Cause
These 16 mutating route handlers (`POST`/`PATCH`) were wrapped directly in `withAuthorization` (or `withRateLimit(withAuthorization(...))`) instead of `withMutationGuard`, bypassing `assertCsrf` and `requireTrustedHeaders`.

## Fix
Wrapped all 16 mutating handlers in `withMutationGuard` from `@/server/http/mutation-guard`, preserving `requiredRole` and `rateLimit` options.

## Verification & Backtrack
- `bash scripts/check-csrf-coverage.sh`: PASS (`Scanned 345 mutation routes... OK`)
- `npx tsc --noEmit`: PASS (0 errors)
- `tests/gate/policy/csrf.test.ts`: PASS
