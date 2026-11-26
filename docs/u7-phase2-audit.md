# U7 Phase 2 — Inverted Wrapper (`withRateLimit(withAuthorization(...))`) Audit

**Date:** 2026-11-26  
**Repository:** `/opt/monitoring/compose` (`git@github.com:jntucej/monitoring.git`, branch `main`)  
**Baseline:** `b73beb0b` (`feat: U7 Phase 1 — withApiChain orchestrator + 5 pilot routes`)  
**Status:** Audit Only (no code changes, no deployment)

---

## 1. Scope & Exact Count

Programmatic AST/regex verification across `src/app/api/**/route.ts` confirms:
- **45** live `export const METHOD = withRateLimit(withAuthorization(...))` sites across **44** unique route files (`src/app/api/campus/goals/route.ts` has both `GET` and `POST`; `src/app/api/admin/users/route.ts` has a multi-line `GET` export plus a comment on line 118).
- **Batch A (GET):** 27 sites
- **Batch B (POST/PATCH):** 17 sites
- **Batch C (UPLOAD):** 1 site
- **Total:** `27 + 17 + 1 = 45` live sites.

All **45** sites require authentication (`withAuthorization`), and **none** use Next.js `context.params` (all dynamic routes parse `req.url` / `req.nextUrl.pathname`).

---

## 2. Complete 45-Site Inventory

### Batch A — Read-Only `GET` Routes (27 sites)

| # | Route | Auth / RBAC | Rate Limit Config |
|---|---|---|---|
| 1 | `/api/admin/hostel-tickets` | `withAuthorization` (admin path) | `{ keyPrefix: "admin_tickets", maxRequests: 60 }` |
| 2 | `/api/admin/role-requests` | `requiredRole: ADMIN_ROLES` | `{}` (default 120/min) |
| 3 | `/api/admin/users` (`GET`) | `requiredRole: ["sysadmin", "admin"]` | `{ windowMs: 60_000, maxRequests: 60 }` |
| 4 | `/api/campus-extra/analytics` | `withAuthorization` | `{ keyPrefix: "campus_extra_analytics", maxRequests: 60 }` |
| 4 | `/api/campus-extra/calendar` | `withAuthorization` | `{ keyPrefix: "campus_extra_calendar", maxRequests: 60 }` |
| 5 | `/api/campus-extra/feedback` | `withAuthorization` | `{ keyPrefix: "campus_extra_feedback", maxRequests: 60 }` |
| 6 | `/api/campus-extra/handover` | `withAuthorization` | `{ keyPrefix: "campus_extra_handover", maxRequests: 30 }` |
| 7 | `/api/campus-extra/knowledge` | `withAuthorization` | `{ keyPrefix: "campus_extra_knowledge", maxRequests: 60 }` |
| 8 | `/api/campus-extra/portfolio` | `withAuthorization` | `{ keyPrefix: "campus_extra_portfolio", maxRequests: 30 }` |
| 9 | `/api/campus-extra/task-drafts` | `withAuthorization` | `{ keyPrefix: "campus_extra_task_drafts", maxRequests: 60 }` |
| 10 | `/api/campus/achievements` | `withAuthorization` | `{ keyPrefix: "campus_achievements", maxRequests: 60 }` |
| 11 | `/api/campus/events` | `withAuthorization` | `{ keyPrefix: "campus_events", maxRequests: 60 }` |
| 12 | `/api/campus/feed` | `withAuthorization` | `{ keyPrefix: "campus_feed", maxRequests: 60 }` |
| 13 | `/api/campus/goals` (`GET`) | `withAuthorization` | `{ keyPrefix: "campus_goals_get", maxRequests: 60 }` |
| 14 | `/api/campus/me` | `withAuthorization` | `{ keyPrefix: "campus_me", maxRequests: 60 }` |
| 15 | `/api/campus/recap` | `withAuthorization` | `{ keyPrefix: "campus_recap", maxRequests: 30 }` |
| 16 | `/api/deputy-warden/delegation` | `withAuthorization` | `{ keyPrefix: "deputy_warden_delegation", maxRequests: 60 }` |
| 17 | `/api/feedback` | `requiredRole: ["admin", "sysadmin"]` | `{ keyPrefix: "feedback_get", maxRequests: 30 }` |
| 18 | `/api/gate/verify-pass` (`GET`) | `withAuthorization` | `gateLimit` (`{ windowMs: 60_000, maxRequests: 120 }`) |
| 19 | `/api/me/access-log` | `withAuthorization` | `{ windowMs: 60_000, maxRequests: 60 }` |
| 20 | `/api/me/consent` | `withAuthorization` | `{ windowMs: 60_000, maxRequests: 30 }` |
| 21 | `/api/me/workspace` | `withAuthorization` | `{ windowMs: 60_000, maxRequests: 60 }` |
| 22 | `/api/notifications/preferences` | `withAuthorization` | `{ keyPrefix: "notif_pref_get", maxRequests: 60 }` |
| 23 | `/api/permissions/[ticket]/document` | `withAuthorization` | `{ keyPrefix: "permission_document_get", maxRequests: 100 }` |
| 24 | `/api/permissions/my-counts` | `withAuthorization` | `{ keyPrefix: "perm_my_counts", maxRequests: 120 }` |
| 26 | `/api/students/[roll]` | `requiredRole: ["admin", "sysadmin", "student"]` | `{ keyPrefix: "student_details", maxRequests: 100 }` |
| 27 | `/api/users` | `requiredRole: ["admin", "sysadmin"]` | `{ keyPrefix: 'users_list', maxRequests: 600 }` |

### Batch B — Mutating `POST` / `PATCH` Routes with `assertCsrf` (17 sites)

| # | Method | Route | Rate Limit Config |
|---|---|---|---|
| 27 | `POST` | `/api/anti-ragging/report` | `{ windowMs: 60_000, maxRequests: 5 }` |
| 28 | `POST` | `/api/campus/events/[id]/register` | `{ windowMs: 60_000, maxRequests: 30 }` |
| 29 | `POST` | `/api/campus/goals/[id]/complete` | `{ keyPrefix: "campus_goal_complete", maxRequests: 30 }` |
| 30 | `POST` | `/api/campus/goals` | `{ keyPrefix: "campus_goals_post", maxRequests: 20 }` |
| 31 | `POST` | `/api/complaints/[id]/call` | `{ windowMs: 60_000, maxRequests: 10 }` |
| 32 | `POST` | `/api/complaints` | `{ windowMs: 60_000, maxRequests: 20 }` |
| 33 | `POST` | `/api/emergency/sos` | `{ windowMs: 60_000, maxRequests: 10 }` |
| 34 | `PATCH` | `/api/gate/scan/[id]` | `{ windowMs: 60_000, maxRequests: 20 }` |
| 35 | `POST` | `/api/mess/token/[code]/send-sms` | `{ windowMs: 60_000, maxRequests: 10 }` |
| 36 | `POST` | `/api/permissions/[ticket]/amend` | `{ windowMs: 60_000, maxRequests: 10 }` |
| 37 | `POST` | `/api/permissions/[ticket]/biometric` | `{ windowMs: 60_000, maxRequests: 30 }` |
| 38 | `POST` | `/api/permissions/[ticket]/forward` | `{ windowMs: 60_000, maxRequests: 30 }` |
| 39 | `PATCH` | `/api/permissions/[ticket]` | `{ windowMs: 60_000, maxRequests: 60 }` |
| 40 | `POST` | `/api/permissions/[ticket]/sign` | `{ windowMs: 60_000, maxRequests: 20 }` |
| 41 | `POST` | `/api/student/emergency-alert` | `{ windowMs: 60_000, maxRequests: 3 }` |
| 42 | `POST` | `/api/student/guardian-link` | `{ windowMs: 60_000, maxRequests: 5 }` |
| 43 | `POST` | `/api/student/meal-opt-out` | `{ windowMs: 60_000, maxRequests: 10 }` |

### Batch C — Multipart Upload Route (1 site)

| # | Method | Route | Rate Limit Config | Special Handling |
|---|---|---|---|---|
| 44 | `POST` | `/api/permissions/[ticket]/upload` | `{ windowMs: 60_000, maxRequests: 10 }` | Uses `req.formData()` — migrate with `withApiChain(..., { csrf: true, rateLimit: ... })` **without** `bodySchema` so multipart stream is untouched |

---

## 3. Behavioral & Response-Compatibility Assessment

1. **Rate-limit bucket key change (intended fix):**
   - Before: `withRateLimit` ran before `withAuthorization`, so `x-user-id` was absent and all 44 sites bucketed by IP (`rl:<path>:<ip>`).
   - After (`withApiChain`): `withAuthorization` runs first, so `withRateLimit` buckets by verified `u:<userId>` (`rl:<path>:u:<userId>`).
2. **Unauthenticated probes:**
   - Before: unauthenticated requests consumed IP rate-limit quota before hitting `withAuthorization` 401.
   - After: unauthenticated requests are rejected immediately with `401` by `withAuthorization` without polluting user buckets.
3. **CSRF & Body parsing:**
   - All 18 mutating sites (`Batch B` + `Batch C`) already enforce `assertCsrf(req)`. `withApiChain` enforces `assertCsrf(req)` before the handler, and `bodySchema` is omitted in Phase 2 (body validation expansion is separate from U7).
4. **Success & 4xx/5xx responses:**
   - All existing handler return values, status codes, and `x-ratelimit-*` headers are preserved.

---

## 4. Migration Batches, Verification & Rollback

- **Batch A (27 `GET` sites):** Mechanical swap to `withApiChain(handleGet, { route, auth: "user", requiredRole?, rateLimit })`.
- **Batch B (17 `POST`/`PATCH` sites):** Mechanical swap to `withApiChain(handlePost/Patch, { route, auth: "user", csrf: true, rateLimit })` (removing redundant inner `assertCsrf(req)`).
- **Batch C (1 `UPLOAD` site):** Swap `permissions/[ticket]/upload` to `withApiChain(handlePost, { route, auth: "user", csrf: true, rateLimit })` (no `bodySchema`).
- **Verification:** `tsc --noEmit`, full `vitest` + new Phase 2 regression test verifying `0` remaining `withRateLimit(withAuthorization` sites and user-scoped bucket isolation on representative Batch A/B/C routes, `unslop-ui --strict`, `npm run build`.
- **Rollback:** Single-commit revert (`git revert <commit>`) restores all 44 files cleanly; no DB/env/Docker changes.
