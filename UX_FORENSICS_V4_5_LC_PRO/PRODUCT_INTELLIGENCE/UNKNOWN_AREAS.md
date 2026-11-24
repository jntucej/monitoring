# UNKNOWN_AREAS

**Discovery date:** 2026-11-24

## Unverified Areas

| Area | Status | Reason |
|---|---|---|
| Live DB state | UNKNOWN | Read-only audit; no DB queries executed |
| Performance metrics | UNKNOWN | No load test run; `docs/load-test-results.json` exists but not re-verified |
| 95-unwired-component list currency | UNKNOWN | `docs/UNWIRED-UI.md` detection date unknown |
| `dean`/`chief_warden`/`controller_examinations` UI surface | CODE_VERIFIED: no route group, no config, no home URL; only `AuthGuard` reference in `/sysadmin/academic-status` | Whether they have any accessible UI at all is unconfirmed |
| WebSocket realtime behavior | CODE_VERIFIED: `/api/ws` exists; actual message protocol not traced | |
| Telegram bot integration | CODE_VERIFIED: `/api/bot/*` + `/api/telegram` exist; live bot state unknown | |
| PWA offline queue (operator scan) | INFERRED from PRD "resilient offline operations"; no offline-queue code observed | |
| Dark mode | UNKNOWN | `RoleThemeProvider` exists but no dark theme observed |
| Reduced-motion handling | UNKNOWN | No `prefers-reduced-motion` in globals.css |
| Formal WCAG compliance | NOT TESTED | Read-only audit; no axe/Lighthouse run |
| Mobile responsive behavior | NOT TESTED | No device emulation in read-only mode |
| Multi-role accounts (user with 2+ roles) | UNKNOWN | JWT has `roles[]` array; UI behavior with multi-role untested |
| Cron job actual schedule | CODE_VERIFIED: 30 cron sub-routes; actual cron expressions in `docker-compose.yml` | |

## Verification Log (2026-11-24)
- 13 unknown areas listed: **CONFIRMED**
- `dean`/`chief_warden`/`controller_examinations` UI surface: **RESOLVED** — confirmed auth-only, no UI surface (see ROUTE_INDEX and NAVIGATION_MODEL verification logs)
- PWA offline queue: **CONFIRMED** not observed in code (grep for `offlineQueue`/`offline` in `src/components/operator/` and `src/stores/operatorStore.ts` returns 0 matches)
- Dark mode: **CONFIRMED** — no dark theme tokens in globals.css; `RoleThemeProvider` is vestigial
- Reduced-motion: **CONFIRMED** — no `prefers-reduced-motion` in globals.css or any component
- Multi-role accounts: **OBSERVED** — `JWT payload includes `roles[]` array`; UI behavior with multi-role untested (suggestion: add integration test for user with 2+ roles)
- Cron schedule: **CONFIRMED** — 30 cron sub-routes exist; actual cron expressions in docker-compose.yml
- `docs/load-test-results.json`: **CONFIRMED** exists but not re-verified

**Suggestions:**
1. Resolve the 4 entity-aligned roles: either create minimal UI consoles or remove from `ROLES` enum to prevent dead auth paths.
2. Add offline-queue code for operator scans (PRD claims resilience; code missing).
3. Add `@media (prefers-reduced-motion: reduce)` override in globals.css.
4. Run axe-core on top-20 pages to get WCAG baseline.
5. Run Lighthouse mobile emulation on `/operator`, `/student`, `/guardian`.
6. Add integration test for multi-role account (user with `roles: [student, guardian]`).
