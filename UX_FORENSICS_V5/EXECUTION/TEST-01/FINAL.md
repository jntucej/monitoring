# TEST-01 — `nav-snapshots.test.ts` 3 Failing Day-Scholar Nav Tests

- **Issue ID:** TEST-01
- **Severity:** MEDIUM
- **Priority:** P1
- **Status:** VERIFIED

## Original Failure
`npm run test:vitest` failed 3 tests in `tests/unit/nav-snapshots.test.ts`:
- `nav keys for day-scholar-in`: expected nav key `'mess'` to be visible
- `nav keys for day-scholar-out`: expected nav key `'mess'` to be visible
- `day scholar's sidebar never shows the hostel Permissions group`: expected `/student/permissions` to be hidden

## Root Cause
In `src/app/(student)/student/_shell/nav.ts`, `when: isHosteller` was accidentally placed on the `mess` group instead of the `permissions` (`Passes & Requests`) group and its children.

## Fix
Moved `when: isHosteller` back onto the `permissions` group and its 3 children (`/student/passes`, `/student/permissions`, `/student/permissions/new`), and removed `when: isHosteller` from `mess`.

## Verification & Backtrack
- `npm run test:vitest`: PASS (`37 passed (37)`, `333 passed (333)`)
- `npx tsc --noEmit`: PASS (0 errors)
