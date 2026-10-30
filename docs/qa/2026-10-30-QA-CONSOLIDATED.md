# QA Consolidated Improvement Report — 2026-10-30

Production audit of `https://monitor.ucej.in` (5-container stack on Tailscale 100.122.7.62).
Executed by 3 parallel QA agents (browser-driven, read-only) covering:
- **ADMIN** full admin console + API sweep → `2026-10-30-qa-admin.md`
- **Mixed-role flows** (OPERATOR, STUDENT, GUARDIAN, FACULTY, SYSADMIN, PRINCIPAL, WARDEN) → `2026-10-30-qa-mixed-roles.md`
- **14 remaining roles + 20-route endpoint matrix + error states + a11y** → `2026-10-30-qa-endpoints-roles.md`

## Overall Status

| Category | Result |
|---|---|
| Roles tested | 21/21 login PASS, dashboards render clean |
| Mobile (375px) | 0 horizontal overflow across all role consoles |
| API RBAC | 401/403 enforcement verified on 20 routes; `/api/health` public 200 |
| Fatal errors | 1 React runtime error (#441) on `/principal` root |
| Dead routes | `/operator/mode`, `/operator/lookup`, `/operator/profile`, `/mobile`, `/api/auth/pin-login` → 404 |

## Prioritized Fixes

### P1 — Functional defects
1. **Principal dashboard crash**: `RoleDashboardPanel` throws React #441 when campus occupancy metrics are `"Data unavailable"`/null. Guard null/empty KPI values in the panel and in `/api/principal/dashboard`.
2. **Worker & Parent "Panel failed to load"** top widget: same `RoleDashboardPanel` aggregator widget failing on zero assigned work orders / zero linked students. Soft-notice is fine, but the exception should be a deliberate empty state, not a panel error.
3. **Dead routes**: add redirects — `/operator/mode|lookup|profile` → `/gate/{id}` tabs; `/mobile` → `/student`; PIN login docs (`README_CREDENTIALS`) still advertise removed `/api/auth/pin-login` (removed in commit `56d7b04840`) — update docs.

### P2 — UX / responsive
4. **Wide tables on mobile**: `/admin/users` (1037px) and `/admin/support` (637px) require horizontal swipe at 375px. Convert to stacked cards below `sm:` breakpoint.
5. **Silent RBAC redirects**: access to `/sysadmin/*` from lower roles bounces to overview with no explanation — add a toast ("restricted to System Administrators").
6. **Floating voice/bot button** can obscure pagination/modal footers on narrow screens — add safe-area padding / z-index tuning.
7. **Duplicate `<h1>` on `/login`** (banner + card) — demote card title to `<h2>`.

### P3 — Housekeeping
8. Top-level `/api/admin/users` and `/api/admin/analytics` 404 by design (subpaths) — document in API index.
9. `/api/exam/superintendent` returns clean 501 for its role — implement or drop from the endpoint index.
10. Kiosk `/api/operator/kiosk-session` 426 `PIN_REQUIRED` — confirm kiosk hardware flow still expects PIN; it is the only endpoint returning 426.

## Verified Working (no action)
- All 21 role logins, role-scoped AuthGuard bounces, lockout messaging (structured 401 payloads).
- Admin API latency 100–132 ms; real data hydration (1548 users, 153 backups/330 MB, disk 16%).
- Accessibility: contrast >14:1, labelled inputs, aria-labelled toggles.
- RBAC: `/api/admin/monitoring` correctly 403 for non-sysadmin.

## Next Steps
- Fix P1 items in a PR (principal panel null-guard is the only crash).
- Re-run `docs/api_test.sh` after fixes to confirm endpoint matrix stays green.
