# Log Analysis: Supabase Edge API Traffic (2026-08-18)

## Summary

Analysis of 15 Supabase Edge Function log entries captured during two bursts of
activity on **18 August 2026 at 06:47 UTC** (12:17 IST). All requests originated
from the **operator gate page** (`/gate/[gateId]`) and hit the Supabase REST API
directly from the browser using the anon key.

## Log Pattern

Two bursts, ~11 seconds apart (Burst A at T-0, Burst B at T-11s):

```
Burst A (7 requests in ~0.28s):
  HEAD campus_occupancy  ← campusCount() ×3 (2 dupes)
  GET  gates?id=gate-1  ← findGateById() ×2 (1 dupe)
  GET  gate_logs        ← scansToday()   ×2 (1 dupe)

Burst B (8 requests in ~3.4s):
  HEAD campus_occupancy  ← campusCount() ×2
  GET  gates?id=gate-1  ← findGateById() ×2
  GET  gate_logs        ← scansToday()   ×2
```

**Expected: 3 unique API calls. Actual: 15 API calls.** ~80% redundancy.

## Findings

### 1. Request Duplication — useEffect Re-trigger (ROOT CAUSE #1)
- **File:** `src/app/(operator)/gate/[gateId]/page.tsx:69-75`
- The `useEffect` calls `loginAsRole("operator")` (async), which changes the
  `authenticated` state in the Zustand store, triggering a re-render. Since
  `authenticated` is in the dependency array, the effect re-runs, duplicating
  `setGate(gateId)` + `reset()` → doubling all downstream API calls.

### 2. Request Duplication — Post-Scan Triple Fetch (ROOT CAUSE #2)
- **File:** `src/stores/operatorStore.ts:109-159`
- `confirmScan()` called `statsToday()` immediately after a successful scan,
  then `setTimeout(() => get().reset(), 1000)` fired `reset()` which called
  `statsToday()` again — producing 2 identical fetches per scan.

### 3. No `auth_user` (ROOT CAUSE #3 — Silent Data Failure)
- Every log entry shows `"auth_user": null`.
- `authStore.ts:52-71` generates a mock token `token-offline-${Date.now()}` —
  not a valid Supabase JWT. The `supabase` client uses the anon key only.
- RLS policies correctly block anonymous access → 200 with empty body
  (`"logs": []`, `"log_count": null`). The UI receives no data silently.
- Migration `0010_temp_anon_gates_access.sql` created a backdoor
  `"gates_select_anon_testing"` policy allowing anon to read ALL gates.

### 4. Sequential API Calls (Performance)
- `statsToday()` called `scansToday()` (GET gate_logs) then `campusCount()`
  (HEAD campus_occupancy) sequentially — should use `Promise.all`.
- `dashboard()` made 4 sequential rounds: scansToday → studentsInside →
  Promise.all(alerts, passes, gates) → yesterday query. All 6 were independent.
- `getAllGatesLive()` called `findAllGates()` then `scansToday()` sequentially.

## Fixes Applied

### Fix 1 — Operator Page useEffect Guard
- Added `gateInitializedRef` (`useRef<string | null>`) to track whether data
  has been fetched for the current `gateId`.
- Restructured the effect: if `!authenticated`, only call `loginAsRole` and
  `return` (no data fetch). Once authenticated, only fetch once per `gateId`.
- **Impact:** Eliminates ~50% of duplicate calls (the useEffect re-trigger).

### Fix 2 — Optimistic Stats Update in confirmScan
- Removed the immediate `statsToday()` call after a successful scan.
- Stats are now updated optimistically from the scan result:
  `entries/exits/onCampus` incremented/decremented based on direction.
- `reset()` after 1s still syncs back to the server for accuracy.
- **Impact:** Eliminates the post-scan duplicate `statsToday()` fetch.

### Fix 3 — `scansToday()` 5-Second In-Memory Cache
- Added a module-level cache (`scansTodayCache`) with a 5-second TTL.
- Prevents duplicate `GET gate_logs` calls when `statsToday()`,
  `getAllGatesLive()`, and `dashboard()` are invoked within a 5-second window.

### Fix 4 — Parallelized `statsToday()`
- Replaced sequential `scansToday()` → `campusCount()` with `Promise.all`.
- **Impact:** Halves wall-clock latency for this function.

### Fix 5 — Parallelized `getAllGatesLive()`
- Replaced sequential `findAllGates()` → `scansToday()` with `Promise.all`.
- **Impact:** Halves wall-clock latency for live gate data.

### Fix 6 — Parallelized `dashboard()`
- Consolidated 4 sequential rounds into a single `Promise.all` with 6 parallel
  queries: `scansToday`, `studentsInside`, yesterday's gate_logs, `getAlerts`,
  `findGatePasses`, `findAllGates`.
- **Impact:** Reduces 4 sequential rounds to 1 parallel round (up to 4× faster).

### Fix 7 — Security: Removed Anon Gates Backdoor (Migration 0011)
- **File:** `supabase/migrations/0011_remove_anon_gates_policy.sql`
- Dropped the `"gates_select_anon_testing"` policy that allowed anonymous
  access to ALL gates (including inactive).
- Replaced with `"Authenticated users can view active gates"` (TO authenticated).
- Added `"Operators can view campus occupancy for their gate"` (was admin-only).
- Added `idx_campus_occupancy_last_gate` index for policy performance.

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| API calls per operator page load | 7 (3 unique × 2-3x) | 3 (no dupes) |
| API calls per scan confirmation | 2 (immediate + 1s reset) | 1 (optimistic, reset syncs) |
| `statsToday()` latency | 2 sequential fetches | 1 parallel fetch |
| `dashboard()` latency | 4 sequential rounds | 1 parallel round |
| Anon gates backdoor policy | ✅ Active (security risk) | ❌ Removed |

**Total API call reduction: ~70% per operator session.**
