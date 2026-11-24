# V6-01 — Replace `alert()` with `useToast()` in Complaint Components

- **Task ID:** V6-01
- **Severity:** MEDIUM
- **Priority:** P1
- **Status:** VERIFIED

## Observed Failure
`ComplaintForm.tsx:97` and `ComplaintDetail.tsx:126,143` used blocking browser `alert()` dialogs on API/upload errors instead of the app's `useToast()` notification system.

## Root Cause
Legacy `alert()` calls remained in `ComplaintForm.tsx` and `ComplaintDetail.tsx` after other surfaces were migrated to `useToast()`.

## Fix
Imported `useToast` from `@/components/ui/toast` and replaced all 3 `alert(...)` calls with `addToast({ variant: "error", message: ... })`.

## Verification
- `npx tsc --noEmit`: PASS (0 errors)
- `npm run test:vitest`: PASS (37/37 files, 333/333 tests)
- `npm run test:gate:ui`: PASS (18/18 suites, 69/69 tests)
- `grep -rn "\balert(" src/`: 0 remaining `alert()` calls in `src/`
