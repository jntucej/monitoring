# F-HOD-03 — 15s TTL on approval queue

- **Status:** VERIFIED
- **Root Cause:** `src/app/(approver)/hod/_shared/ApprovalsView.tsx` configured `useApiResource(..., { ttlMs: 15_000 })` without `usePolling`, so the queue did not auto-refresh after the 15s TTL expired.
- **Fix:** Added `usePolling(refresh, { intervalMs: 15_000 })` in `ApprovalsView.tsx`.
- **Verification:** `npx unslop-ui . --strict --quiet` (`100/100` in 2427 files), `npx tsc --noEmit` (`0` errors).
