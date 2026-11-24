# V7-01 — Fix 8 React Rules of Hooks Runtime Errors

- **Task ID:** V7-01
- **Status:** VERIFIED
- **Files Changed:** 8

## Root Cause
1. `useRouter()` was called inside event handlers/callbacks (`signOutAll`, `executeCommand`, `handleLogout`) in 6 components, which throws `Invalid hook call` at runtime.
2. `useMemo()` was called after an early `return null` in `MiniSparkline.tsx`.
3. `usePersona()` was called conditionally via `opts.persona ?? usePersona()` in `usePassTypes.ts`.

## Verification
- `npx eslint --quiet` on all 8 files: PASS (0 errors)
- `npx tsc --noEmit`: PASS (0 errors)
