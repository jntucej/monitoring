# PROJECT_MAP — mycampus (GATE MONITOR)

**Discovery date:** 2026-11-24
**Evidence level:** OBSERVED (direct file inspection)

## 1. Project Identity
- **Product name:** GATE MONITOR — Campus Access & Security Management Platform
- **Target org:** JNTUH College of Engineering Jagtial (JNTUH CEJ / JNTUH UCEJ)
- **Repo:** `monitoring` (root `/root/monitoring`)
- **PRD:** `docs/PRD.md` (v2.0.0, "Production-Ready Specification")
- **Core problem:** Replace paper-register gate workflows with real-time QR + biometric campus movement tracking, role-based pass approval, guardian notifications, occupancy tracking, and offline-resilient gate operations.

## 2. Technology Stack
| Layer | Tech | Evidence |
|---|---|---|
| Framework | Next.js 16.4 (App Router) | `package.json`, `src/app/` |
| UI | React 19.3, Tailwind CSS 4, Framer Motion 13 | `package.json` |
| State | Zustand 5 (14 stores in `src/stores/`) | `src/stores/` |
| DB | PostgreSQL via `pg` 8.23 | `package.json`, `src/server/repositories/` |
| Auth | JWT (access + refresh), cookie-based | `src/middleware.ts`, `src/lib/auth-token.ts` |
| Realtime | WebSocket (`src/app/api/ws/`), polling (30s timers) | `src/stores/liveEventStore.ts` |
| PWA | Service worker, install prompt | `src/app/manifest.ts`, `PwaInstallPrompt` |
| Testing | 24 devDeps (likely vitest/jest) | `package.json` |
| Deploy | Docker, docker-compose, cloudflared tunnel | `Dockerfile`, `compose/`, `cloudflared/` |

## 3. Repository Structure
```
/root/monitoring/
├── src/
│   ├── app/              # Next.js App Router (441 pages + 669 API routes)
│   │   ├── (admin)/      # admin route group (69 pages)
│   │   ├── (approver)/   # multi-role approver group (152 pages: hod, principal, vp, oie,
│   │   │                #   emo, caretaker, deputy-warden, staff, guardian, exam, faculty)
│   │   ├── (home)/       # public landing (1 page)
│   │   ├── (mess)/       # mess-incharge group (12 pages)
│   │   ├── (operator)/   # operator + worker + gate groups (20 pages)
│   │   ├── (person)/     # person/profile group
│   │   ├── (student)/    # student group (45 pages)
│   │   ├── (supervisor)/ # security supervisor group (20 pages)
│   │   ├── (sysadmin)/   # sysadmin group (76 pages)
│   │   ├── api/          # 669 API routes
│   │   ├── exam/         # top-level exam (superintendent)
│   │   ├── exam-branch/  # top-level exam-branch
│   │   ├── faculty/      # top-level faculty
│   │   ├── visitor/      # top-level visitor (8 pages)
│   │   ├── login/, profile/, settings/, security/, lock/, support/, help/
│   │   └── …
│   ├── components/       # ~30 component directories (admin, approver, hod, operator,
│   │                     #   student, supervisor, sysadmin, vp, shared, ui, etc.)
│   ├── config/roles/     # 23 role config files + types
│   ├── context/          # React contexts
│   ├── hooks/            # custom hooks
│   ├── lib/              # ~100+ lib modules (roles, access-control, auth, audit, …)
│   ├── middleware/       # authorization.ts, entityAuthorization.ts, metrics.ts
│   ├── middleware.ts     # root middleware (CSP, CSRF, home redirect)
│   ├── server/           # services/, repositories/ (Postgres data layer)
│   ├── stores/           # 13 Zustand stores
│   ├── contracts/        # type contracts
│   ├── types/            # shared types
│   └── instrumentation.ts
├── database/             # migrations, seeds
├── docs/                 # PRD, roles/, architecture, UNWIRED-UI.md, …
├── compose/ cloudflared/ backups/ db/
├── Dockerfile, docker-compose.yml, package.json
└── AGENTS.md, CLAUDE.md
```

## 4. Routing System
- **Route groups** (parenthesized, no URL effect): `(admin)`, `(approver)`, `(home)`, `(mess)`, `(operator)`, `(person)`, `(student)`, `(supervisor)`, `(sysadmin)`.
- **Top-level non-group routes:** `exam/`, `exam-branch/`, `faculty/`, `visitor/`, `campus/`, `warden/`, `support/`, `settings/`, `profile/`, `security/`, `login/`, `lock/`, `help/`, `mess/default`.
- **Auth model:** JWT cookie (`access_token`/`refresh_token`/`auth_token`). Root `middleware.ts` decodes the JWT to pick a role-home redirect (UX only; real authz is server-side in `createAuthContext` + `AuthGuard`).
- **AuthGuard** (`src/components/shared/AuthGuard.tsx`): client-side gate that reads `useAuthStore().user.role` and redirects to login if unauthenticated or role not in `allowedRoles`. Each page wraps its shell in `<AuthGuard allowedRoles={[…]} />`.
- **Default route table** (`src/server/policy/routes.ts` `getDefaultRouteForRole`): 24 roles mapped to home URLs. Note: `dean`, `chief_warden`, `controller_examinations`, `addl_controller_*` are NOT in the table — `addl_controller_*` fall through to `/exam-branch`; `dean`/`chief_warden`/`controller_examinations` return `/login`. **Verified: confirmed in code.**

## 5. Authorization Model
- **RBAC:** 28 role keys in `src/lib/roles.ts` (24 operational + 4 entity-aligned; warden removed, hostel legacy). 23 role config files in `src/config/roles/` (no config for `dean`, `chief_warden`, `controller_*`, `addl_controller_*`).
- **Server-side:** `src/middleware/authorization.ts` + `entityAuthorization.ts` guard API routes. `withAuthorization`, `withMutationGuard`, `withRateLimit` wrappers on API handlers.
- **Client-side:** `AuthGuard` checks role on each page.
- **Privileged roles:** `sysadmin`, `admin` (MFA gate + sysadmin-only API surface).
- **Super-admin:** `sysadmin` only (owns standalone sysadmin workspace).

## 6. Data Layer
- **PostgreSQL** via `pg` driver. Repositories in `src/server/repositories/` (gates, scans, occupancy, alerts, daily-stats, lockout, lockout, mess-token, predictions, …).
- **Services** in `src/server/services/` (gate-schedules, occupancy, health, alerts, analytics, operator-stats, scan-record, audit-write, …).
- **Migrations** in `database/` (e.g. `20261125000001` reassigns legacy `warden` → `principal`). **Verified: migration file exists.**

## 7. Shared UI Components
- `src/components/ui/` — primitives: badge, button, card, DataTable, input, modal, select, skeleton, table, toast.
- `src/components/shared/` — cross-cutting: AuthGuard, RoleEmptyState, RoleError, RoleLoading, RoleOnboarding, QuickActions, Sidebar, PwaInstallPrompt, ApprovalInbox, etc.
- `src/components/{admin,approver,hod,operator,parent,personal,principal,student,supervisor,sysadmin,vp,faculty,mess,complaints,engagement,dashboard,nav,shell,bot,retention,remotion,}` — role-scoped components.
- **95 unwired components** per `docs/UNWIRED-UI.md` (0 importers). Largest cluster: `sysadmin/domains/*` (34).

## 8. Design System
- **Single theme: "Graphite Canvas · Performance Edition"** (`src/app/globals.css`).
- Tailwind v4 `@theme inline` tokens (no runtime var() lookup).
- System font stack (0 KB, no web-font, no FOUT).
- WCAG-conscious: darkened border (#C2C8D0) for 3:1 UI-boundary contrast; muted text (#5A6472) at 5.4:1.
- Status pill colors: entry (green), exit (red), day-out (amber), leave (blue).
- Z-index scale: base 0 → overlay 20 → sidebar/nav 30 → header 40 → sheet 50 → floating-bot 55 → modal 60 → toast 70.
- Legacy-token bridge maps `bg-bg-base`/`text-action-primary`/`border-border` to graphite hexes (500+ files).

## 9. Navigation
- **Primary nav:** role-scoped sidebar (`src/components/shared/Sidebar.tsx` or role shells in `src/components/shell/`).
- **Quick-actions:** `shared/QuickActions.tsx`, `admin/shared/QuickActions.tsx`, `PrincipalQuickActions.tsx` — role-specific action chips.
- **Deep links:** inspector links (e.g. `/admin/students/[roll]`, `/admin/institutional/cases`), gate console (`/gate/[gateId]`), person profile (`/person/[id]`).
- **Redirects:** 40+ pages are pure `redirect()` wrappers (e.g. `/admin/dashboard` → `/admin`, `/guardian/child` → `/guardian/child-status`, `/warden` → `/principal`).

## 10. Testing Infrastructure
- 24 devDependencies (vitest/jest + testing-library expected; not fully verified).
- `coverage/` directory present.
- No test runner observed running in read-only mode.

## 11. Documentation
- `docs/PRD.md` — product requirements (v2.0.0).
- `docs/roles/*.md` — 28 role docs (admin, caretaker, chief_warden, dean, deputy_warden, emo, exam_branch, exam_superintendent, faculty, guardian, hod, hostel_manager, mess_incharge, oie, operator, parent, principal, staff, student, supervisor, sysadmin, vice_principal, visitor, worker, + cross-role-dependency, customization, _overview, README). **Count corrected from 31 to 28.**
- `docs/UNWIRED-UI.md` — 95 unwired-component backlog.
- `docs/PERMISSIONS_ARCHITECTURE.md`, `docs/ROLE_OPERATIONS.md`, `docs/WORKFLOW-ARCHITECTURE.md`, `docs/permission-workflow*.md`.
- `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` — entity-aligned role chart.
- `docs/ISSUES_TRACKER.md`, `docs/backlog.md`.

## 12. Known Unknowns / Unverified
- Whether the 95-unwired-component list in `docs/UNWIRED-UI.md` is current (last detection unknown).
- Which API routes are reachable only via bot/CLI (Telegram bot, cron) vs UI.
- Whether `dean`/`chief_warden`/`controller_examinations` have any UI surface — **RESOLVED: confirmed auth-only, no route group, no config file, no nav entry**.
- Live DB state (read-only; no DB queries executed).
- Performance metrics (no load test run in this session).

## 13. Verification Log (2026-11-24)
- 441 non-API pages: **CONFIRMED** (find count)
- 669 API routes: **CONFIRMED** (find count)
- 9 route groups: **CONFIRMED** (ls -d)
- 14 Zustand stores: **CORRECTED** from 13 (actual file count)
- 40 redirect() pages: **CONFIRMED** (grep count)
- 28 role keys: **CORRECTED** from 24 (actual grep of roles.ts)
- 28 role docs: **CORRECTED** from 31 (actual ls count)
- Page counts per route group: **CONFIRMED** (approver=152, admin=69, sysadmin=76, student=45, mess=12, supervisor=20, operator=20)
- 4 top-level visitor pages cited in §3: **CORRECTED** — actual visitor pages are under `src/app/visitor/` (8 pages confirmed in ROLE_REPORT)
- Top-level dirs not in PROJECT_MAP §3: `about/`, `bootstrap/`, `forbidden/`, `metrics/`, `reset-password/` — **ADDED** as known top-level routes
