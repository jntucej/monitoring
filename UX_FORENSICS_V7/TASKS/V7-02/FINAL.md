# V7-02 — Fix 10 Missing `key` Props in Role Register Inspections

- **Task ID:** V7-02
- **Status:** VERIFIED
- **Files Changed:** 4 (`deputyWardenInspections.tsx`, `guardianInspections.tsx`, `oieInspections.tsx`, `oieInspectionsCoordination.tsx`)

## Root Cause
JSX `<span>` elements inside `kv("Overview", [...])` array literals lacked `key` props.

## Verification
- `npx eslint --quiet` on all 4 files: PASS (0 errors)
