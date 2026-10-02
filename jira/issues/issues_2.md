# Issues Found in the Gate Monitor Codebase

Below is a prioritized audit of concrete bugs, security gaps, and inconsistencies across the files provided. I've grouped by severity and cited the file + line-level symptom.

---

## 🔴 Critical — broken SQL / data mismatches

### 1. Corrupted migration file `supabase/migrations/20260916000000_security_rls_and_function_hardening.sql`
This file **will not execute** as-is. Two distinct problems:

**a) Unclosed policy in SECTION 5** (`tcomments_insert`):
```sql
CREATE POLICY tcomments_insert ON public.support_ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())::text
    AND (
      public.is_admin_self()
      OR (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_ticket_comments.ticket_id
            AND t.user_id = (SELECT auth.uid())::text
        )
      )
-- SECTION 6 begins here — missing `)` `)` `;` before the next DROP POLICY
DROP POLICY IF EXISTS ann_select_published ON public.announcements;
```

**b) Orphaned fragment at end of file** (after the SECTION 7 `DO $$ … END $$;`):
```sql
  END LOOP;
END $$;
    )
  );
END $$;
```
The trailing `)  );  END $$;` is dangling — the `DO` block already closed.

**Impact:** No RLS policies are applied; subsequent migrations/seed may run against an unprotected schema.

---

### 2. `flag_status` DB constraint ≠ code values
- **Schema** (`supabase/schema.sql`):
  ```sql
  flag_status TEXT CHECK (flag_status IN
    ('OVERDUE','UNAUTHORIZED_EXIT','NO_GATE_PASS','SUSPENDED','CURFEW_VIOLATION','MANUAL_LOCKDOWN'))
  ```
- **Code** (`src/lib/db.ts`, `src/app/api/users/[id]/route.ts`):
  ```ts
  const VALID_FLAGS: Array<FlagStatus> = ["suspicious", "restricted", null];
  // setUserFlag(flag) → UPDATE users SET flag_status = 'suspicious'
  ```
- **UI check** (`src/components/admin/StudentInfographics.tsx`):
  ```ts
  const flagged = allStudents.filter(s => s.flag_status === "suspicious").length;
  ```

Any `setUserFlag` call raises a CHECK-constraint violation. The flagging feature is effectively dead.

**Fix:** align on one enum (`'OVERDUE' | 'NO_GATE_PASS' | …`) and use it in the type, the API, and the UI.

---

### 3. Rate limiter references a non-existent column
`src/lib/rate-limit.ts` (production fallback):
```ts
const { count } = await client
  .from('api_metrics')
  .select('*', { count: 'exact', head: true })
  .eq('endpoint', key)              // ← column does not exist
  …
await client.from('api_metrics').insert({
  endpoint: key,                    // ← not a column
  response_time: 0,
  status_code: limited ? 429 : 200,
  timestamp: new Date().toISOString(),
});
```
Schema for `api_metrics` is `(path, method, status_code, response_time, error, timestamp)`. Both the read and write silently fail (`void`), so production rate limiting degrades to per-instance memory — ineffective on serverless.

---

## 🔴 Critical — RLS / service-client misuse

### 4. Many server-side lib functions use the **anon** `supabase` client
On the server, the module-level `supabase` client is created once with the **anon key** and no user session. `auth.uid()` is `NULL`, so every RLS policy that filters on `auth.uid()` denies the query. Functions that use `supabase` directly (instead of `getDbClient()` / `getSupabaseServiceClient()`) will silently return `[]`/`null` or fail inserts:

| File | Function(s) | Symptom |
|---|---|---|
| `src/lib/db.ts` | `getAlerts`, `scansToday`, `findUserByLogin`, `verifyPin`, `createVisitor`, `checkInVisitor`, `checkOutVisitor`, `getLinkedPersons` | Empty results / insert failures |
| `src/lib/audit.ts` | `logAuditEvent` | Audit trail entries silently dropped |
| `src/lib/notification-service.ts` | `sendNotification`, `deliverNotification`, channel senders | Notifications never persist |
| `src/lib/occupancy.ts` | `getCurrentOccupancy`, `getOccupancyHistory` | Returns zeros |
| `src/lib/predictive.ts` | `generatePredictions`, `getPredictions`, `detectAnomalies` | Empty predictions |
| `src/lib/scheduling-assistant.ts` | `generateScheduleSuggestions`, `applyScheduleSuggestion` | No-op |
| `src/lib/user-analytics.ts` | `getUserEngagementMetrics` | Empty |
| `src/lib/backup.ts` | `createDatabaseBackup`, `restoreDatabaseBackup`, `listBackups` | Snapshot/restore fails |
| `src/lib/departments.ts` | `getDepartments` | Falls back to hard-coded list (works, but hides the real DB) |

Example of the correct pattern (already used elsewhere in `db.ts`):
```ts
const { getSupabaseServiceClient } = await import('./supabaseClient');
const client = getSupabaseServiceClient();
```

---

### 5. `getGateStudentInfo` uses the anon client
`src/lib/authContext.ts`:
```ts
const { data: userRecord } = await supabase
  .from('users')
  .select('*, student_details(*)')
  .or(`unique_id.eq.${formattedId},id.eq.${formattedId}`)
  .maybeSingle();
```
Called from `/api/students` when the caller is an `operator`. Because the route runs unauthenticated at the DB layer, the query returns 0 rows and the operator gets `NOT_FOUND` for every legitimate student.

**Fix:** swap `supabase` → `getSupabaseServiceClient()`.

---

## 🟠 High — broken routing / auth wiring

### 6. Redundant, broken `PATCH` in `src/app/api/users/route.ts`
```ts
async function handlePatch(req: NextRequest) {
  const url = new URL(req.url);
  const targetUserId = url.pathname.split('/').pop(); // "users"
  …
}
export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ['admin','sysadmin'] }),
  …
);
```
Next.js routes `PATCH /api/users/<uuid>` to `src/app/api/users/[id]/route.ts` — so this handler is only reachable at `PATCH /api/users` (no id), where `targetUserId` becomes the literal string `"users"`. The correct PATCH already exists in `[id]/route.ts`. This duplicate is dead code and a footgun.

---

### 7. Lockdown fetch on operator page missing auth headers
`src/app/(operator)/gate/[gateId]/page.tsx`:
```ts
const res = await fetch("/api/admin/lockdown"); // ← no Authorization / X-Session-Token
```
`/api/admin/lockdown` requires `["admin","sysadmin","operator"]`, so the operator always receives **401** and `activeLockdown` is forever `null`. Lockdown never blocks scans on the operator desk.

**Fix:** attach `getAuthHeaders()` (or build the same headers the store uses for `/api/operator/stats`).

---

### 8. Operators can see the flag toggle but the API forbids it
`src/components/operator/ScanConfirmation.tsx` renders "FLAG THIS ACCOUNT / BLOCK ID". It calls `PATCH /api/users/[id]`. That route rejects anyone who isn't admin/sysadmin:
```ts
if (isSelf && !isAdmin) { /* blocks flagStatus changes */ }
```
The operator's click silently fails (`if (res.ok) setIsFlagged(...)` — no error path). Either hide the button for operators, or extend the route to allow `operator` with a narrower payload (`flagStatus` only).

---

## 🟡 Medium — UX, mislabels, missing guards

### 9. "Admin PIN" label is misleading
`src/components/operator/ManualEntryDialog.tsx`:
```tsx
<label>Admin PIN (required for manual entry)</label>
…
const candidates = [user?.employeeId, user?.uniqueId, user?.email]; // ← the operator's own IDs
```
The PIN verified is the **operator's own PIN**, not an admin's. Functionally fine (it re-authenticates the current user), but the label should read "Confirm your PIN" — or the flow should actually accept an admin's identifier.

---

### 10. `/api/gates/schedule/current` has no auth or rate limit
`src/app/api/gates/schedule/current/route.ts`:
```ts
export async function GET() { … }   // ← no withAuthorization, no withRateLimit
```
It reads `gate_holidays` and `gate_access_rules` with the anon client. Either wrap it with `withAuthorization`/`withRateLimit`, or document it as a public endpoint (it currently is not gated by anything).

---

### 11. `departments` table not in `schema.sql`
`src/lib/departments.ts` queries `supabase.from("departments")`, and `/api/departments` POSTs upserts to it, but the schema dump never creates it. `getDepartments` falls back gracefully; the write paths (`POST/PATCH /api/departments`) will fail unless someone creates it out-of-band. Either add the table to `schema.sql` or drop the endpoints.

---

## 🟢 Low — readability / minor inefficiencies

- `src/app/api/admin/jobs/[id]/run/route.ts`: comment says `[id] is segments[3]` but the code uses `segments[segments.length - 2]`. Comment is misleading.
- `src/components/admin/StatCard.tsx`: `parseFloat("85%")` → `85`, so percentage strings render without the `%`. Only matters if any caller passes a `%` string.
- `src/lib/db.ts` `findPersonByUniqueId` Tier 2: after Tier 1 fails, Tier 2 issues another `select('*')` on `users` — one round-trip of duplicated work. Merge into Tier 1 with a fallback to the simplified query only when the FK-embedded select errors.
- `src/app/api/admin/sessions/route.ts`: query runs with the anon client (see #4), so `handle IS NOT NULL` filtering returns 0 rows in production. Admin "Active Sessions" page is empty.
- `src/app/api/admin/dashboard/route.ts`: pulls `users.select('role').limit(5000)` and, when occupants exist, a second `in('id', occupantIds)` fetch. For very large user tables this is heavy for a page that polls every 30 s; consider precomputing in `daily_stats` or an RPC.
- `src/app/(admin)/admin/students/page.tsx`: `console.log` of every API response — should be removed / gated behind `process.env.NODE_ENV !== 'production'`.
- `src/app/api/auth/logout/route.ts`: `rawToken.startsWith("eyJ")` is a good JWT shape check but the constant `"eyJ"` should be documented (base64 of `{"`).

---

## Summary of immediate fixes (ordered)

1. **Repair the SQL migration** — close `tcomments_insert` and delete the orphaned trailing block.
2. **Align `flag_status`** — pick one enum; use it in schema, `FlagStatus`, `VALID_FLAGS`, and `StudentInfographics`.
3. **Fix rate limiter** — change `endpoint` to `path` and supply `method`.
4. **Swap anon → service client** in the ~10 server-only lib files (audit, notification, occupancy, predictive, scheduling, user-analytics, backup, departments, plus `getGateStudentInfo`, `getLinkedPersons`, `getAlerts`, `scansToday`, `findUserByLogin`, `verifyPin`, `createVisitor`, `checkInVisitor`, `checkOutVisitor`).
5. **Add auth headers** to the operator lockdown fetch.
6. **Delete the dead `PATCH`** in `src/app/api/users/route.ts`.
7. **Fix label / authorization** for the "Admin PIN" and "Flag account" controls.
8. **Gate or remove** `/api/gates/schedule/current`.
9. **Add `departments` table** to `schema.sql` (or remove the write endpoints).

If you'd like, I can produce a patch set for items 1–4 (the ones that silently break production) first — those have the highest blast radius.