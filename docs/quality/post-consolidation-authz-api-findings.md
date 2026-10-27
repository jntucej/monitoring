# Post-Consolidation Authz/API Findings (Agent B)

Workstream: Agent B — API + authz verification for the warden→principal consolidation
(commit `d4f3cdf5`). Scope: authorization hardening, API endpoint audit, business-workflow
verification (principal perspective).

## Summary

| Area | Result |
|---|---|
| `withAuthorization` role scans | PASS — no invalid `warden` role in any auth gate |
| `hostel` legacy role | Recognized in `src/lib/roles.ts`; used intentionally in 2 routes |
| Privilege expansion from consolidation | NONE FOUND |
| Stale session on role change | FIXED (see Finding #2) |
| API endpoint shape compatibility | PASS |
| Business workflows (hostel chain, exam, staff_leave, lab_access, passes) | PASS |

## 1. withAuthorization Scan

Grepped all `withAuthorization` calls under `src/app/api/**`.

- No `requiredRole` array contains the invalid role string `"warden"`.
- `"hostel"` (legacy) appears only in:
  - `config/custom-reasons` — intended for hostel staff
  - `deputy-warden/delegation` — intended for approver-surface roles
- `"principal"` is present in `requiredRole` arrays for:
  - `/api/principal/audit` (already fixed by Agent A)
  - `/api/principal/dashboard`
  - `/api/occupancy/presence-matrix`
  - `/api/attendance_records`
  - `/api/staff/attendance`
  - `/api/staff/stats`
  - `/api/permissions` (via `stage` param logic)
  - `/api/passes` (GET + action)
  - `/api/attention/queue`

## 2. Findings & Fixes

### Finding #1 — `staff/stats` ROLE_GROUPS contains stale `"warden"`

- **File:** `src/app/api/staff/stats/route.ts:23`
- **Before:** `{ label: "Hostel", roles: ["warden", "principal", "deputy_warden", "hostel_manager", "caretaker", "supervisor"], ... }`
- **After:** `{ label: "Hostel", roles: ["principal", "deputy_warden", "hostel_manager", "caretaker", "supervisor"], ... }`
- **Impact:** Cosmetic — `warden` was not an auth gate, only a display-label grouping in the stats endpoint. Removed the stale reference.

### Finding #2 — `updateUserRole` missing session invalidation

- **File:** `src/lib/db.ts` (~line 1603)
- **Gap:** `updateUserRole` called `invalidateAllUserSessions(userId)` but did **not** call
  `invalidateAuthCache(userId)`. The `authContext.ts` user-row cache (30s TTL) could serve a
  stale `CachedUserRow` with the old role until TTL expiry, meaning the next request for that
  user (within 30s) would still carry the pre-consolidation role.
- **Fix:** Added `import { invalidateAuthCache } from './authContext'` and called
  `invalidateAuthCache(userId)` immediately after `invalidateAllUserSessions(userId)` in
  `updateUserRole`, matching the pattern used by `updateAccountStatus` and the users `[id]`
  credential-change route.
- **Affected callers:** `src/app/api/users/[id]/route.ts:311`, `src/app/api/users/bulk/route.ts:99`,
  `src/app/api/users/route.ts:406`, `src/app/api/admin/role-requests/[id]/route.ts:79`.

## 3. API Endpoint Shape Compatibility (Principal UI)

Verified that every endpoint consumed by `src/app/(approver)/principal/**` pages returns a
compatible shape:

| Endpoint | Consumer page | Shape check |
|---|---|---|
| `/api/alerts?resolved=false` | `principal/page.tsx`, `incidents/page.tsx` | PASS |
| `/api/occupancy/presence-matrix` | `approval-centre/page.tsx`, `hostel/permissions/page.tsx` | PASS — returns `{ matrix, gates, roles, lastUpdated }` |
| `/api/permissions` | `permissions/page.tsx`, `approval-centre/page.tsx` | PASS — returns `{ success, data[], total }`; `student` alias resolved via `requester_user_id` join |
| `/api/permissions?workflow_type=hostel&stage=principal` | `permissions/page.tsx` | PASS — OR filter includes `warden_or_principal` |
| `/api/permissions?workflow_type=staff_leave&stage=principal` | `permissions/page.tsx` | PASS |
| `/api/permissions?workflow_type=exam&stage=principal` | `permissions/page.tsx` | PASS |
| `/api/staff/attendance` | `attendance/page.tsx`, `reports/page.tsx` | PASS |
| `/api/students?scope=active` | `approval-centre/page.tsx` | PASS |
| `/api/principal/audit` | `audit/page.tsx` | PASS (already fixed) |
| `/api/campus-extra/analytics?role=principal` | `department-analytics`, `departments` | PASS |
| `/api/passes?status=` | `all-pass-requests/page.tsx` | PASS |

## 4. Business Workflow Verification

### 4.1 Hostel outpass chain (principal is final approver)

```
caretaker → deputy_warden → hostel_manager → warden_or_principal → completed
```

- `WORKFLOW_STAGES['hostel']` in `src/lib/permission-workflow.ts` — confirmed.
- `ROLE_STAGE_PERMISSIONS['principal'] = ['warden_or_principal', 'principal']` — confirmed
  that principal **can** approve at the `warden_or_principal` stage.
- `/api/permissions/[ticket]` PATCH: `canApproveAtStage(role, workflow_type, current_stage)`
  gates approval; `validateAndApplyAction` enforces transition state machine
  (`enforce_permission_transitions` in `database/migrations/20261011000035_permission_state_machine.sql`).
- `/api/permissions/bulk`: `validateAndApplyAction` per-ticket, principal included in
  `requiredRole`.

### 4.2 Exam workflow

- `WORKFLOW_STAGES['exam']` — principal is terminal approver. Confirmed via
  `ROLE_STAGE_PERMISSIONS` and `resolveNextStage`.

### 4.3 Staff leave workflow

- `WORKFLOW_STAGES['staff_leave']` — includes `principal` as final stage.
- `canApproveAtStageWithBranch` enforces same-branch for HOD; principal bypasses branch
  scoping (correct).

### 4.4 Passes

- `/api/passes` GET: principal + supervisor in `requiredRole`.
- `/api/passes/[passId]/action`: `wardenHostel` scoping check still present (cosmetic variable
  name, not a role gate). No privilege regression.

## 5. Verification Commands

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (no output — zero errors) |
| `npm run test:unit` | **PASS** — 92 passed, 0 failed; all role routing snapshot tests green |
| `node scripts/verify-layering.js` | **PASS** — "OK: no layering violations" |

## 6. Files Modified

| File | Change |
|---|---|
| `src/app/api/staff/stats/route.ts` | Removed stale `"warden"` from Hostel ROLE_GROUPS bucket |
| `src/lib/db.ts` | Added `invalidateAuthCache(userId)` call in `updateUserRole` |
