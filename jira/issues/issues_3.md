# Gate Monitor — Full Issue List (~150 items)

I only listed ~30 issues before. Here is the exhaustive pass across the whole codebase. Grouped by file/area with severity tags `[C]=Critical [H]=High [M]=Medium [L]=Low`.

---

## 🔴 AUTH & SESSION (highest priority)

1. **[C]** `src/app/api/auth/login/route.ts` — mints a custom HS256 JWT (`getSigningKey()` / `MOBILE_TOKEN_SECRET`) but every protected route validates via `supabase.auth.getUser()`. Login succeeds, then all APIs 401.
2. **[C]** `src/app/api/auth/login/route.ts` — never sets `users.handle`, so `withAuthorization`'s `x-session-token === profile.handle` check always fails.
3. **[C]** `src/app/api/auth/login/route.ts` — no `refresh_token` returned in the JSON body (only cookie), yet the frontend likely expects one.
4. **[C]** `src/app/api/auth/mfa/bootstrap/route.ts` — wrapped in `withAuthorization`, making the break-glass path unreachable.
5. **[H]** `src/app/api/auth/sso/route.ts` — OIDC callback **does not validate `state`** → CSRF on login.
6. **[H]** `src/app/api/auth/sso/route.ts` — POST accepts `role` from the request body → self-promotion to admin.
7. **[H]** `src/app/api/auth/sso/route.ts` — hardcodes group `["Campus-Security-Leads"]` for role mapping instead of using actual `groups`.
8. **[H]** `src/app/api/auth/sso/route.ts` — falls back to `sso_${code}@college.edu` email if the token has none.
9. **[H]** `src/app/api/auth/change-password/route.ts` — has `/* eslint-disable */` at top; verifies against `user.password_hash` but the schema has no such column (auth lives in `auth.users`), so the current-password check is a no-op in practice.
10. **[H]** `src/app/api/auth/change-password/route.ts` — calls `supabase.auth.admin.updateUserById(id, { password: hashedPassword })` with a **bcrypt-hashed** password; Supabase expects plaintext.
11. **[M]** `src/app/api/auth/login/route.ts` — `password.trim()` will silently break any legitimate password with trailing whitespace.
12. **[M]** `src/app/api/auth/login/route.ts` — unused imports `randomUUID`, `isMfaRequiredForAdmin`.
13. **[M]** `src/app/api/auth/login/route.ts` — three unused `*Err` binding names.
14. **[M]** `src/app/api/auth/2fa/setup/route.ts` — stores TOTP secret in plaintext (`two_factor_secret`), no KMS/encryption.
15. **[M]** `src/app/api/auth/2fa/authenticate/route.ts` — accepts `userId` + token with no session check; rate limit is the only guard.
16. **[M]** `src/app/api/auth/2fa/authenticate/route.ts` — returns different errors for "not enabled" vs "invalid TOTP", leaking enrollment state.
17. **[M]** `src/app/api/auth/session/route.ts` — refreshes Supabase session but never writes new cookies back; caller keeps the stale token.
18. **[M]** `src/app/api/auth/pin-login/route.ts` — duplicates CSRF logic from `src/middleware/csrf.ts`.
19. **[L]** `src/app/api/auth/logout/route.ts` — swallows all errors with `.catch(() => {})`; fine, but no metrics.
20. **[L]** `src/app/api/auth/reset-password/route.ts` — fine (uniform response) but the rate limit is only 3/15min which is easy to trip.

## 🟠 AUTHORIZATION / IDOR

21. **[C]** `src/app/api/notifications/stream/route.ts` — trusts `?userId=` query param; no check it matches the authenticated `x-user-id` → SSE IDOR.
22. **[H]** `src/app/api/operator/stats/route.ts` — `if (gateId) query.eq("gate_id", gateId)`; **operators with no assigned gate see every gate's stats**.
23. **[H]** `src/app/api/passes/[passId]/route.ts` — PUT allows any `warden`/`admin` to approve any pass; no per-hostel/per-department scoping.
24. **[H]** `src/lib/authContext.ts` — `validateGateAccess` only restricts `operator`; every other role falls through to `return context` unmodified.
25. **[H]** `src/app/api/students/route.ts` — `if (![, "admin", "sysadmin", "operator"].includes(authRole || ""))` — the leading `undefined` element means a **missing header slips through**.
26. **[H]** `src/app/api/persons/route.ts` — same `[, "admin", "sysadmin", "operator"]` bug in GET search branch.
27. **[H]** `src/app/api/admin/role-requests/route.ts` — `ADMIN_ROLES` includes `faculty`, `hod`, `staff`; these roles can create/approve promotions.
28. **[H]** `src/app/api/admin/role-requests/route.ts` — inserts with field `requested_role`, but `[id]/route.ts` reads `request.new_role` — one of these is wrong.
29. **[H]** `src/app/api/config/navigation/route.ts` — GET is unauthenticated+rate-limited to 50/min but used on every page load; POST/PATCH/DELETE are `sysadmin` only (OK).
30. **[M]** `src/app/api/admin/audit/route.ts` — re-does the role check that `withAuthorization` already did.
31. **[M]** `src/app/api/admin/backup/route.ts` — same redundant role check in both handlers.
32. **[M]** `src/app/api/users/[id]/route.ts` — PATCH rejects self-modification, but admins legitimately need to update their own profile.
33. **[M]** `src/app/api/support/tickets/route.ts` — GET filters `user_id = actorId` even for admins; admins can't see user tickets via this route.
34. **[M]** `src/app/api/support/tickets/[id]/comments/route.ts` — POST lets caller set `isInternal` themselves.
35. **[M]** `src/app/api/onboarding/{complete,next,status}/route.ts` — `withAuthorization(handler)` with no `requiredRole` — any authenticated user is allowed.
36. **[M]** `src/app/api/hod/faculty/route.ts` — stacks `withAuth(withAuthorization(...))`, doubling Supabase round-trips.
37. **[M]** `src/app/api/analytics/daily-stats/route.ts` — same `withAuthAndStatus(withAuthorization(...))` double-wrap.
38. **[M]** `src/app/api/analytics/export/route.ts` — same.
39. **[M]** `src/app/api/analytics/visitors/route.ts` — same.
40. **[M]** `src/app/api/persons/[uniqueId]/history/route.ts` — extracts uniqueId via `filter(Boolean)[3]`; brittle if path shape changes.
41. **[L]** `src/app/api/visitors/route.ts` — `host:person_id(*)` join returns full user record including `initial_pin_hash`, `two_factor_secret` if RLS is off.
42. **[L]** `src/app/api/announcements/active/route.ts` — returns `[]` on any DB error, hiding misconfigurations.

## 🟠 SCHEMA ↔ CODE MISMATCH

43. **[C]** `src/app/api/config/roles/route.ts` — POST writes `description`, `icon_name`, `default_redirect`; the `config_roles` table has none of these.
44. **[C]** `src/app/api/departments/route.ts` — POST writes `numeric_code`; the `departments` table doesn't define it.
45. **[C]** `src/lib/departments.ts` — reads `row.short_name`, `row.numeric_code`; schema doesn't define either.
46. **[C]** `src/app/api/system/config/route.ts` — reads `system_config` by column `key`; schema defines `id` only.
47. **[H]** `src/app/api/users/[id]/route.ts` — writes `account_status`; schema column is `status`.
48. **[H]** `src/app/api/users/[id]/route.ts` — writes `body.flags` (array); schema has singular `flag_status`.
49. **[H]** `src/app/api/users/[id]/route.ts` — `VALID_STATUSES` set doesn't match the schema `status` CHECK list.
50. **[H]** `src/app/api/users/route.ts` — `VALID_ROLES` omits `visitor`, `faculty`, `staff`, `worker`; schema allows them.
51. **[H]** `src/app/api/attendance_records` (sync-bridge sink) — writes `dedupe_key`, `person_id`, `device_serial`, `direction`, `timestamp_utc`, `verify_mode_details`; `attendance_records` was created as a generic `data JSONB` reconciliation table.
52. **[H]** `supabase/schema.sql` — `movement_logs.reason` CHECK excludes NULL but the column allows NULL.
53. **[H]** `supabase/schema.sql` — `handle_new_user()` reads `raw_user_meta_data->>'role'`; **attacker-controllable** at signup.
54. **[H]** `supabase/schema.sql` — `users.role` CHECK includes `visitor`; `VALID_ROLES` in code doesn't.
55. **[M]** `supabase/schema.sql` — reconciliation tables (`announcements`, `sessions`, `scans`, `system_config`, `visitor_pre_registrations`, etc.) are just `id + data JSONB` but APIs use real structured columns.
56. **[M]** `supabase/schema.sql` — `daily_stats` PK `(date, gate_id)` and `gate_id` FK cascades deletes; deleting a gate wipes historical stats.
57. **[M]** `supabase/schema.sql` — `notify_session_invalidation` fires `pg_notify` but nothing in the codebase listens on that channel.
58. **[M]** `supabase/schema.sql` — duplicate indexes: `idx_mlogs_user_id` and composite `idx_mlogs_user_timestamp` etc.
59. **[M]** `supabase/schema.sql` — RLS `dstats_select_own ON daily_stats FOR SELECT TO authenticated USING (true)` — any authenticated user can read **all** stats; likely a copy-paste bug.
60. **[M]** `supabase/schema.sql` — `mlog_select_staff` grants wardens access to all `movement_logs`, no hostel scoping even though `student_details` has it.
61. **[M]** `supabase/schema.sql` — `gates.id` is UUID, but `src/app/api/gates/route.ts` POST generates `gate-${Date.now()}` as id.
62. **[M]** `supabase/schema.sql` — `alerts.user_unique_id` is a VARCHAR with no FK, so nothing guarantees it points to a real user.
63. **[L]** `supabase/schema.sql` — `users.handle` UNIQUE but nullable; multiple NULLs allowed which is fine, but the comment doesn't say so.
64. **[L]** `supabase/schema.sql` — `users.phone` no length/format check.

## 🔴 MIGRATIONS

65. **[C]** `supabase/migrations/20260916000000_security_rls_and_function_hardening.sql` — contains orphan `)` / `END $$;` fragments at the end (`    );\n  END $$;`) that don't parse. Migration will not apply.
66. **[H]** `supabase/migrations/20260916000000_*.sql` — no idempotency guard around the `ALTER TABLE ... ENABLE RLS` block (safe, but statements after the syntax error are skipped).
67. **[M]** `supabase/migrations/20260913_device_user_mappings.sql` — creates table but no RLS enabled, so it silently relies on service_role.
68. **[L]** `supabase/migrations/*.sql` — no `IF NOT EXISTS` on the `CREATE INDEX` for the mappings migration.

## 🟠 API ROUTE LOGIC

69. **[H]** `src/app/(admin)/admin/gates/[id]/page.tsx` — passes `?gateId=` to `/api/admin/dashboard`; the route ignores the query param → shows campus-wide data.
70. **[H]** `src/app/api/analytics/enhanced/route.ts` — reads `scan.department`, but `movement_logs` has no such column; department breakdown stays 0.
71. **[H]** `src/app/api/analytics/daily/route.ts` — same column doesn't exist; role join `users:users!movement_logs_user_id_fkey(role)` may fail if the FK name doesn't match.
72. **[H]** `src/app/api/students/stats/route.ts` — `query.eq("student_type", typeFilter)` on `users`; `student_type` lives on `student_details`.
73. **[H]** `src/app/api/students/stats/route.ts` — `.sort((a,b)=>parseInt(a.year)-parseInt(b.year))` where `year` is `` `Year ${n}` `` → `parseInt("Year 1") === NaN`.
74. **[H]** `src/app/api/students/stats/route.ts` — `onCampusToday = todayEntries - todayExits` — wrong if a student entered yesterday and exits today.
75. **[M]** `src/app/api/admin/jobs/[id]/run/route.ts` — `getIdFromPath` reads `segments[len-2]`; correct for `/run` suffix, fragile.
76. **[M]** `src/app/api/admin/jobs/[id]/route.ts` — PATCH doesn't 404 if the job doesn't exist; silently updates 0 rows.
77. **[M]** `src/app/api/admin/lockdown/route.ts` — `createLockdown(scopes, message, actorId)` signature doesn't match the schema's `lockdown_broadcasts` shape (`data JSONB`).
78. **[M]** `src/app/api/admin/lockdown/stream/route.ts` — every connected client polls `getActiveLockdown()` every 2s; N clients = N queries / 2s.
79. **[M]** `src/app/api/admin/security/ip-allowlist/route.ts` — stores allowlist; nothing in `withAuthorization` reads it. Dead feature.
80. **[M]** `src/app/api/admin/sessions/route.ts` — `catch (err)` unused; returns `{success: true, data: []}` on error, hiding outages.
81. **[M]** `src/app/api/admin/sessions/[id]/route.ts` — deletes from `sessions` table whose schema is a generic `data JSONB` stub.
82. **[M]** `src/app/api/analytics/advanced/route.ts` — falls back to `Math.random()` buckets when no logs exist; UI presents them as real.
83. **[M]** `src/app/api/analytics/occupancy/route.ts` — doesn't skip scans with missing `user_id`.
84. **[M]** `src/app/api/gate/devices/route.ts` — `Promise.resolve(service.from(...).select()).catch(...)` — `PostgrestBuilder` isn't a Promise; the `.catch` never fires.
85. **[M]** `src/app/api/gate/logs/route.ts` — POST accepts unbounded `scans[]` array; no size limit / batch cap.
86. **[M]** `src/app/api/gates/schedule/current/route.ts` — `JSON.parse(rule.days_of_week || "[]")` silently swallows malformed JSON.
87. **[M]** `src/app/api/gates/schedule/route.ts` — has extra indentation and an `if (error)` inside a `try` that was likely a merge artifact.
88. **[M]** `src/app/api/gates/[id]/route.ts` — PATCH accepts raw body fields with no schema validation.
89. **[M]** `src/app/api/mobile/[...path]/route.ts` — no token refresh; 30-day hard expiry.
90. **[M]** `src/app/api/notifications/route.ts` — `recipientType !== authRole` blocks students from fetching role-broadcast notifications.
91. **[M]** `src/app/api/staff/attendance/route.ts` — defensive `Array.isArray(u.employee_details)` suggests the join shape is unreliable across Supabase versions.
92. **[M]** `src/app/api/staff/attendance/route.ts` — `status.toLowerCase() !== "active"` in `getGateStudentInfo`, but values are stored as `"ACTIVE"`; case-sensitive compare elsewhere.
93. **[M]** `src/app/api/users/bulk/route.ts` — iterates in a JS loop with no transaction; partial failures leave orphan auth users.
94. **[M]** `src/app/api/users/bulk/route.ts` — password `randomBytes(16).toString("hex") + "Aa1!"` — fixed suffix weakens entropy.
95. **[M]** `src/app/api/workers/shifts/route.ts` — `l.gate_id || "Main Gate"` mixes a gate name string into a `gate_id` field.
96. **[M]** `src/app/api/departments/route.ts` — compares `users.department_id` against both `d.code` and `d.numericCode` in the same map; string vs string is fragile.
97. **[M]** `src/app/api/faculty/attendance/route.ts` — `is_hod` checked only on `users.department_id`; falls back to `employee_details` inconsistently.
98. **[M]** `src/app/api/config/pass-types/route.ts` — PATCH deactivates all rows then upserts; **non-atomic** — if upsert fails, all pass types are gone.
99. **[M]** `src/app/api/config/exit-reasons/route.ts` — `withRateLimit(handleGet as any, ...)` — `as any` casts hide type mismatches.
100. **[M]** `src/app/api/config/navigation/route.ts` — same `as any` cast pattern.
101. **[M]** `src/app/api/config/pass-types/route.ts` — same.
102. **[M]** `src/app/api/analytics/predictions/route.ts` — hardcoded `mape: "4.2%"`, `rmse: 8.7`, `model_version: "v1.2-exp-smooth"` returned as if from a real model.
103. **[M]** `src/app/api/analytics/predictions/retrain/route.ts` — returns `success: true` while `generatePredictions()` may not have run.
104. **[M]** `src/app/api/analytics/reports/[id]/run/route.ts` — CSV content is a hardcoded three-line demo payload.
105. **[M]** `src/app/api/integrations/route.ts` — fallback returns 5 hardcoded integrations if the table is empty.
106. **[M]** `src/app/api/integrations/[id]/sync/route.ts` — audits a `Math.random()` record count.
107. **[M]** `src/app/api/admin/compliance/anonymize/route.ts` — hash suffix uses `Math.random()`; fine for anonymization, but written as if cryptographic.
108. **[M]** `src/app/api/admin/retention/run/route.ts` — "purged" count is `Math.random() * 150 + 12`.
109. **[M]** `src/app/api/cron/reports/route.ts` — `CRON_SECRET` check silently skipped if env var is unset → open endpoint.
110. **[M]** `src/app/api/health/route.ts` — returns 200 for `degraded`, masking alerts.
111. **[M]** `src/app/api/docs/route.ts` — Swagger UI served unauthenticated.
112. **[M]** `src/app/api/voice/interpret/route.ts` — unauthenticated parser endpoint.
113. **[M]** `src/app/api/feedback/route.ts` — GET unauthenticated; POST also unauthenticated with a 1000-entry in-memory store.
114. **[L]** `src/app/api/gate/stream/route.ts` — heartbeat stream is auth-gated but content is a static heartbeat.
115. **[L]** `src/app/api/occupancy/stream/route.ts` — 5s polling per client.
116. **[L]** `src/app/api/announcements/[id]/dismiss/route.ts` — `id: dis-${Date.now()}-${Math.random()}` is fine but `notification-service.ts` and `support/tickets/route.ts` use `Date.now()` alone (collision risk under burst).

## 🟠 SECURITY / CRYPTO

117. **[H]** `src/lib/webauthn.ts` — `validateWebAuthnResponse` always returns `{ valid: true }` — it's a stub that never verifies.
118. **[H]** `src/lib/security.ts` — `verifyScanSignature` doesn't verify the signature at all; returns `{valid: true}` after only checking the timestamp.
119. **[H]** `src/lib/ldap.ts` — `authenticateLdapUser` always returns `{success: true, user: {...}}` when configured; no bind performed.
120. **[H]** `src/lib/totp.ts` — `base32ToBuffer` uses `bits.substring(i, i+8)` on a bit string; the padding arithmetic is wrong for non-multiple-of-5 lengths, silently truncating.
121. **[H]** `src/lib/geo.ts` — no signature/nonce binding between `sysTag` and `geo`; any caller can spoof.
122. **[M]** `src/lib/security.ts` — `isIpAllowed` does prefix matching for `x.x.x.0/24` (string compare); breaks on IPv6 and on `10.0.0.10` vs `10.0.0.1`.
123. **[M]** `src/lib/qr-token.ts` — QR tokens valid 45s but there's no server-side revocation list; a leaked token is usable within the window.
124. **[M]** `src/lib/security.ts` — replay-window check uses client-supplied `timestamp`; `nonce` is length-checked only.
125. **[M]** `src/middleware/csrf.ts` — when `ALLOWED_ORIGIN="*"` the origin check is skipped entirely.
126. **[M]** `src/middleware/auth.ts` — imports `getSupabaseServiceClient` (Node SDK); if this file is bundled into Next edge middleware it will fail at runtime.
127. **[M]** `src/middleware/metrics.ts` — same risk: writes to Supabase from middleware context.
128. **[M]** `src/proxy.ts` — `rateLimit("api_global:${ip}", 300)` uses the *legacy* two-arg signature which returns a Promise; the type is then coerced to `{limited:boolean}` — the runtime shape may not match.
129. **[M]** `src/proxy.ts` — calls CSRF on every `/api/*` including `GET`; harmless but wasteful.
130. **[L]** `src/lib/utils.ts` — `getAuthHeaders()` returns `{}` in SSR; anything that needs auth headers on server is silently unauthenticated.
131. **[L]** `src/lib/env.ts` — validates client vars but only throws in production; in dev, `supabaseUrl` can be empty strings silently.

## 🟠 STATE / HOOKS / CONTEXT

132. **[H]** `src/stores/uiStore.ts` — `success()`, `error()`, `info()`, `warning()` push toasts but **never schedule auto-dismiss**; only `addToast` sets a timer. Those toasts will persist forever.
133. **[M]** `src/stores/uiStore.ts` — persist middleware writes `theme` to localStorage but `setTheme` also writes directly, doubling the source of truth.
134. **[M]** `src/stores/uiStore.ts` — `addToast` uses `Date.now()` + `Math.random().toString(36).slice(2,9)` — collisions unlikely, but the helpers (132) use bare `Date.now()`.
135. **[M]** `src/context/GlassContext.tsx` — two separate `useEffect`s both run the "isMobile → legacy tier" logic; the second overrides the first.
136. **[M]** `src/context/GlassContext.tsx` — `securityMode` derived from `activeAlerts`, but alerts auto-clear after 10s; if an alert expires, security mode silently downgrades.
137. **[M]** `src/context/GlassContext.tsx` — `setCards` exposed but nothing in the app updates card positions.
138. **[M]** `src/hooks/useCampusConfig.ts` — fetches `/api/config/student-rules`; **this route does not exist**.
139. **[M]** `src/hooks/useAuthHeaders.ts` — re-exports `getAuthHeaders` from `@/lib/utils` and also declares its own `useAuthHeaders`; two sources of truth for headers.
140. **[M]** `src/hooks/useLiveRefresh.ts` — `refetch` in a `useEffect` dep array is a ref, but the ESLint disable comment suggests known-stale-closure risk.

## 🟠 LIB

141. **[H]** `src/lib/backup.ts` — checksum compare re-serializes `JSON.stringify(backupData)` after JSON round-trip; key ordering / whitespace mismatch will fail every verify.
142. **[H]** `src/lib/backup.ts` — `restoreDatabaseBackup` with `truncate: true` deletes rows **before** re-insert; any insert failure leaves partial data.
143. **[H]** `src/lib/rate-limit.ts` — Supabase fallback inserts a row into `api_metrics` **on every request**; under load this dominates DB writes.
144. **[M]** `src/lib/rate-limit.ts` — in-memory `store` never pruned globally; only expired keys removed on access.
145. **[M]** `src/lib/rate-limit.ts` — `rateLimits` helper object is defined but never imported anywhere.
146. **[M]** `src/lib/notification-service.ts` — `sendPushNotification` etc. just `console.log` — real delivery is mock.
147. **[M]** `src/lib/predictive.ts` — `detectAnomalies` uses three hardcoded checks (`245 vs 130`, etc.).
148. **[M]** `src/lib/scheduling-assistant.ts` — `applyScheduleSuggestion` inserts with `id: rule-auto-${Date.now()}` — collision under burst.
149. **[M]** `src/lib/user-analytics.ts` — `dau: 1420`, `mau: 3850`, per-role adoption numbers are hardcoded.
150. **[M]** `src/lib/sustainability.ts` — falls back to hardcoded counts on any DB error; UI presents them as measured.
151. **[M]** `src/lib/integrations/email.ts` / `sms.ts` — always return `"sent"` even when `EMAIL_ENABLED` / `SMS_ENABLED` is false.
152. **[M]** `src/lib/integrations/lms-provider.ts` — four providers with near-identical code, no shared base; drift risk.
153. **[M]** `src/lib/integrations/visitor-registration.ts` — emails the QR payload in plaintext.
154. **[M]** `src/lib/occupancy.ts` — inside counts are distributed **proportionally** by capacity, not measured; presented as "live" in dashboards.
155. **[M]** `src/lib/onboarding.ts` — progress stored in an in-memory `Map`, lost on restart.
156. **[M]** `src/lib/departments.ts` — `getDepartments()` cache is 5 min; adding a department in the UI won't show up for 5 minutes.
157. **[M]** `src/lib/rollNumber.ts` — `ROLL_DEPT_CODES` includes only 5 codes but the schema's `DEPARTMENT_CODES` may differ; docs say they disagree.
158. **[M]** `src/lib/sso.ts` — `validateOIDCIdToken` re-fetches the JWKS on every call; no cache.
159. **[M]** `src/lib/sso.ts` — no `state`/PKCE support in `getAuthorizationUrl`.
160. **[M]** `src/lib/jobs.ts` — only three real handlers; `job_runs` insert + audit happens outside a transaction.
161. **[L]** `src/lib/animations.ts` — `buttonTap: any`, `buttonHover: any`, `cardHover: any`, `statusPulse: any` — all lose type safety.
162. **[L]** `src/lib/animations.ts` — `cardHover` hardcodes an emerald box-shadow which clashes with the light theme.
163. **[L]** `src/lib/cache.ts` — comment says Redis fallback; code never uses Redis.
164. **[L]** `src/lib/mobile-auth.ts` — 30-day tokens with no rotation and no revocation list.

## 🟠 COMPONENTS

165. **[H]** `src/components/admin/StudentInfographics.tsx` — `bg-${color}-500/10`, `text-${color}-400`, `border-${accent}-500/20` etc. Tailwind JIT cannot detect these; **styling is stripped**.
166. **[H]** `src/components/sysadmin/GateManagement.tsx` — calls `fetch("/api/gates/{id}", {method:"PATCH"})` which exists, but also `toggleActive` uses `PATCH` on the collection-level route which doesn't export PATCH → 405.
167. **[M]** `src/components/operator/ManualEntryDialog.tsx` — **file is truncated in the pack**, ends mid-`useState`; needs review.
168. **[M]** `src/components/operator/ScanConfirmation.tsx` — `if (!photoVerified || !true)` and `true ? ... : ...` — dead branches left from refactoring.
169. **[M]** `src/components/operator/ScanConfirmation.tsx` — reset effect depends on `student.id` only; a different student with the same id (impossible) or same student rescanned won't reset.
170. **[M]** `src/components/shared/NotificationBell.tsx` — opens an `EventSource` without limit; relies on browser auto-reconnect, so a server bug = runaway clients.
171. **[M]** `src/components/shared/NotificationBell.tsx` — `supabase.channel(...).on("postgres_changes", ...)` — requires Realtime to be enabled for `notifications` table; not mentioned in schema.
172. **[M]** `src/components/admin/StudentList.tsx` — silently caps the list at 30 students.
173. **[M]** `src/components/admin/StudentList.tsx` — imports `getAuthHeaders` from `@/hooks/useAuthHeaders` (a hook file) rather than `@/lib/utils`.
174. **[M]** `src/components/sysadmin/BulkUserImportModal.tsx` — CSV parser uses `line.split(",")` — breaks on quoted commas, escaped quotes, or newlines in fields.
175. **[M]** `src/components/sysadmin/UserManagement.tsx` — `window.prompt()` for PIN reset; no validation UI.
176. **[M]** `src/components/sysadmin/BackupManagement.tsx` — uses `alert()` and `confirm()` — inconsistent with the rest of the UI.
177. **[M]** `src/components/admin/CampusDigitalTwin.tsx` — `next/dynamic(() => Promise.resolve(Component), {ssr:false})` — this is not how `next/dynamic` is meant to be used with a named export; it will work but bypasses code splitting benefit.
178. **[M]** `src/components/admin/CampusDigitalTwin.tsx` — hardcoded zone rectangles (50,50,220,130 etc.) — no relation to real data.
179. **[M]** `src/components/remotion/GlossyMotionPlayer.tsx` — `component={componentToRender as any}` — hides input-prop type mismatch.
180. **[M]** `src/components/operator/ExitReasonSelector.tsx` — has an unused `meta.color` for unknown codes; falls back to info blue.
181. **[M]** `src/components/shared/StatusBadge.tsx` — `reason === "Day Out"` and `"Leave"` string compares; if `reason` is typed `ExitReason`, fine, but if server sends a new value it will silently fall through.
182. **[M]** `src/components/ui/toast.tsx` — auto-dismiss uses `setTimeout` inside the store (fine), but the `useToast()` context proxy and `useUIStore().addToast` both add to the same queue with potentially different IDs.
183. **[M]** `src/components/ui/button.tsx` — `{...(props as any)}` on `motion.button` — loses ref typing.
184. **[M]** `src/components/ui/modal.tsx` — `size="fullscreen"` produces `w-full h-full m-0 rounded-none` but the outer wrapper still centers with padding.
185. **[L]** `src/components/shared/GlassCard.tsx` — `onDragEnd` prop receives a fixed index `0`; drag reordering is non-functional.
186. **[L]** `src/components/shared/GlassCard.tsx` — `WordByWordText` animates every word for every card; expensive on lists.
187. **[L]** `src/components/shared/CountUp.tsx` — on theme change calls `spring.set(0)` then animates to value; can look jarring in `glass ↔ dark`.
188. **[L]** `src/components/admin/EntryExitChart.tsx` — falls back to `json?.items` if `json?.data?.items` missing; the API returns `data` shape only.

## 🟠 SCRIPTS

189. **[C]** `scripts/generate_jira_csv.py` — missing `import json`; `--init` crashes.
190. **[C]** `scripts/init-project.py` — overwrites the real `package.json` and `tsconfig.json` in the repo root with different content (creates `scripts/inspect.ts` etc. that don't exist).
191. **[H]** `scripts/dobuild.js` — runs `git add -A && git commit && git push` from a script with hardcoded absolute path `/Users/akarsh/...`.
192. **[H]** `scripts/commitfix.js` — same pattern; also uses `execSync` with `spawn` semantics inconsistency.
193. **[H]** `scripts/test_jira_automation.py` — asserts `config["project"]["key"] == "GATE"` but the repo config has `GITM`.
194. **[H]** `scripts/validate_jira_csv.py` — same "GATE" assumption.
195. **[M]** `scripts/seed-data.js` — seeds every staff member with PIN `1234` unless `SEED_DEFAULT_PIN` is set.
196. **[M]** `scripts/seed-data.js` — production guard only checks `NODE_ENV` and `VERCEL_ENV`.
197. **[M]** `scripts/checktokens.js` — reads `src/app/globals.css`; that file is not in the pack (may have moved).
198. **[M]** `scripts/lib/env-loader.js` — uses ESM `import`/`export` but is a `.js` in a project without `type: module` for scripts; will fail under CJS require.
199. **[M]** `scripts/lib/env-loader.js` — uses `__dirname`; undefined in ESM.
200. **[M]** `scripts/verify-supabase-migrations.ts` — uses `require(...)` in a `.ts` file that's otherwise ESM.
201. **[M]** `scripts/verify-supabase-migrations.ts` — `err: any` types throughout.
202. **[M]** `scripts/verify-base.sh` — hardcodes `gate_postgres`, `gate_redis` container names, must match `docker-compose.yml` naming.
203. **[M]** `scripts/verify-base.sh` — `stat -c` vs `stat -f` fallback for perms is Linux/macOS-specific; won't work on WSL without extra handling.
204. **[M]** `scripts/seed-backend-events.js` — placeholder that logs and does nothing.
205. **[M]** `scripts/debug-test.js` — placeholder.
206. **[L]** `scripts/cleanup-docs.sh` — `mv` on possibly-missing files with `2>/dev/null` swallows real errors.
207. **[L]** `scripts/windows-host-setup.ps1` — sets `monitor-timeout-ac 15` (15 min) hardcoded.
208. **[L]** `scripts/test-session-invalidation.js` — requires `TEST_OPERATOR_ID` and `TEST_OPERATOR_PIN` to run; not documented in package.json scripts.

## 🟠 CONFIG / BUILD

209. **[H]** `package.json` — `"next": "16.3.1"`, `"react": "19.2.8"`, `"framer-motion": "^13.1.0"`, `"lucide-react": "^1.31.0"` — versions look implausible / unpublished; verify these resolve.
210. **[H]** `tsconfig.json` — `"target": "ES2017"` but `"lib": ["esnext"]` — target should follow lib for modern Next.
211. **[M]** `package.json` — `prebuild` runs `validate-env.js`; that script exits 0 in dev when client vars are missing, so the real build won't be blocked.
212. **[M]** `package.json` — no `typecheck` or `test:unit` script.
213. **[M]** `docker-compose.yml` — postgres `15-alpine`; `docker-compose.base.yml` — postgres `16-alpine`. Drift.
214. **[M]** `docker-compose.base.yml` — hardcoded bind-mount path `/home/akarsh/gate-monitor-data/...`.
215. **[M]** `Dockerfile` — `worker` stage `COPY src/lib/db ./src/lib/db` only; `src/lib/db` imports from `@/lib/*`, so the worker stage will fail resolution at runtime.
216. **[M]** `Dockerfile` — worker runs `npm ci --omit=dev`, but its scripts import `tsx` (a dev dependency).
217. **[M]** `Caddyfile` — default host `gate.example.com`; TLS via `admin@example.com` — no env override in file.
218. **[M]** `.github/CODEOWNERS` — references `/infra/` and `/tests/` directories that don't exist.
219. **[M]** `.github/workflows/branch-name.yml` — restricts to `feature|bugfix|hotfix|infra|test`; no `chore`/`docs`/`refactor`.
220. **[M]** `.github/workflows/qa-evidence.yml` — uses external `marocchino/sticky-pull-request-comment@v2`; not pinned to a SHA.
221. **[M]** `vercel.json` — only `framework: nextjs`; no region, no function config.
222. **[L]** `.repomixignore` — excludes `package-lock.json`; makes AI tools blind to dep versions.
223. **[L]** `repomix.config.json` — `"filePathStyle": "target-relative"` may not be a valid enum value.
224. **[L]** `systemd/gate-stack.service` — hardcodes `/home/akarsh/gate-monitor` working directory.

## 🟠 WORKER

225. **[H]** `worker/index.js` and `worker/index.mjs` — duplicate implementations; only `.mjs` is picked up by the Dockerfile, but the `.js` file will break module resolution in some environments.
226. **[H]** `worker/index.mjs` — imports `src/lib/db` via `import('../src/lib/db')`; but the Dockerfile copies `src/lib/db` as a directory, not a compiled module. Node cannot import raw TypeScript.
227. **[M]** `worker/index.mjs` — spawns `npx tsx` to run the sync bridge from inside the container; requires `tsx` (dev-only) and network access to `npm`.
228. **[M]** `worker/jobs/audit_log_rotation.js`, `backfill_daily_stats.js`, `cleanup_expired_passes.js` — all are empty TODOs.
229. **[L]** `worker/index.js` vs `index.mjs` — the cron schedules are identical in both, so if both run, jobs fire twice.

## 🟠 STUDY APP

230. **[M]** `src/app/study/_ml/*` — parallel implementation to `src/app/study/ml/*`; the leading underscore makes it unrouted but still compiled. Duplicated content.
231. **[M]** `src/data/cheatsheet/aca.ts`, `ai.ts`, `dccn.ts` — placeholder data with `"Concept 1"`.
232. **[M]** `src/app/study/ml/data/unit2b.ts` — arrow functions with trailing comma inside object literal (`],\n  },`) that could break some parsers.
233. **[M]** `src/app/study/pdc/data/unit1c.ts` — same trailing-comma pattern.
234. **[M]** `src/app/study/ai/data/unit4a.ts` — same trailing-comma pattern in `default-information`.
235. **[M]** `src/app/study/atcd/data/*` — thin re-exports from `automata/data`; if you change one, the other drifts silently.
236. **[L]** `src/app/study/ml/data/unit4a.ts` — includes `—` em-dash and non-ASCII characters in data strings; fine for display but be careful with i18n.

## 🟠 MISC

237. **[M]** `src/stores/adminStore.ts` — async methods (`loadDashboard`, etc.) call `set(...)` after `await` without a loading flag around them; concurrent calls can race.
238. **[M]** `src/stores/adminStore.ts` — `recordScan` slices to 50, but no dedupe against `clientEventId`.
239. **[M]** `src/metrics/index.ts` — histograms don't emit `_bucket` lines; Prometheus will not compute percentiles.
240. **[M]** `src/middleware/authorization.ts` — `combineMiddleware`, `requireRole`, `requirePermission`, `withAccountStatusValidation`, `withResourceValidation` are all exported but never used.
241. **[M]** `src/middleware/authorization.ts` — injects identity by mutating `req.headers.set(...)`, which is fragile; passing via the `context.auth` argument (already done) is safer.
242. **[M]** `src/app/(supervisor)/supervisor/page.tsx` — lock-down toggle falls back to local state if API fails; a real lockdown will look deactivated after refresh.
243. **[M]** `src/app/(supervisor)/supervisor/page.tsx` — `studentStrikes` seeded with `{"1": 2}` — a hardcoded demo strike.
244. **[M]** `src/app/(admin)/admin/page.tsx` — `LockdownDialog` UI uses `L()` helper and `H()` function names that look obfuscated.
245. **[M]** `src/app/(admin)/admin/page.tsx` — polls `/api/admin/lockdown` every 30s **and** `/api/admin/dashboard` every 30s; combined this is 4 req/min/user for idle dashboards.
246. **[M]** `src/app/(admin)/admin/analytics/page.tsx` — filter toolbar `<div>` is nested **inside** the CSV/PDF button row, breaking layout.
247. **[L]** `src/app/(admin)/admin/alerts/page.tsx` — imports `RefreshCw` unused.
248. **[L]** `src/app/(admin)/admin/settings/page.tsx` — imports `Component`; verify it's a lucide export.
249. **[L]** `src/app/(student)/student/id/page.tsx` — imports `useEffect, useState` unused.
250. **[L]** `src/app/(sysadmin)/sysadmin/layout.tsx` — destructures `theme, setTheme` but never uses them.

---

### What I'd fix first (in order)

1. **#1–4** — login flow, session token, MFA bootstrap. Everything downstream depends on this.
2. **#65** — the broken migration; nothing else you write will land until it parses.
3. **#189, 190** — scripts that crash or worse, overwrite `package.json`.
4. **#43–52** — schema/code drift; admin config pages are dead until fixed.
5. **#21, 22, 24–26** — IDOR and broken role checks.
6. **#165, 166** — Tailwind dynamic classes + wrong HTTP verb; UI breaks silently.
7. **#132, 141, 143** — toast leak, restore safety, per-request DB write on rate limit.
8. **#167** — the truncated `ManualEntryDialog.tsx` (can't confirm until the full file is available).