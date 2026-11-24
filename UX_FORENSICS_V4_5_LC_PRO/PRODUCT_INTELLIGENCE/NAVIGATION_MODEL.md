# NAVIGATION_MODEL

**Discovery date:** 2026-11-24
**Evidence level:** OBSERVED

## Primary Navigation
- **Role-scoped sidebar** (`src/components/shared/Sidebar.tsx` or role shells in `src/components/shell/`): each role group has its own nav tree.
- **Quick-actions bar** (`shared/QuickActions.tsx`, `admin/shared/QuickActions.tsx`, `PrincipalQuickActions.tsx`): context-sensitive action chips per role.
- **PWA install prompt** (`PwaInstallPrompt`): available on all pages.

## Role-Home Mapping (post-login redirect)
Source: `src/server/policy/routes.ts` `getDefaultRouteForRole()`

| Role | Home URL |
|---|---|
| operator | `/operator` |
| admin | `/admin` |
| sysadmin | `/sysadmin` |
| supervisor | `/supervisor` |
| guardian / parent | `/guardian` |
| student | `/student` |
| warden (legacy) | `/principal` |
| faculty | `/faculty/permissions` |
| staff | `/staff` |
| worker | `/worker` |
| visitor | `/visitor` |
| caretaker | `/hostel/permissions` |
| deputy_warden | `/deputy-warden` |
| hostel_manager | `/hostel-manager` |
| principal | `/principal/approvals` |
| vice_principal | `/vice-principal` |
| oie | `/oie` |
| exam_branch | `/exam-branch` |
| addl_controller_* | `/exam-branch` |
| hod | `/hod` |
| exam_superintendent | `/exam/superintendent` |
| mess_incharge | `/mess` |
| emo | `/emo` |
| **dean** | **`/login`** (not in table → fallback) |
| **chief_warden** | **`/login`** (not in table → fallback) |
| **controller_examinations** | **`/login`** (not in table → fallback) |

## Breadcrumbs
- Not observed as a systematic pattern. Some role shells render a breadcrumb bar; most pages rely on sidebar + header title.

## Tabs
- `admin/users` — tabs within UserManagementPanel.
- `student/profile` — tabs (personal, academic, etc.)
- `sysadmin/health` — tabbed health view.
- `exam/superintendent` — tabbed sub-pages.

## Deep Links
- `/person/[id]` — universal person profile.
- `/gate/[gateId]` — operator gate console.
- `/admin/students/[roll]` — student detail.
- `/admin/institutional/cases` — linked cases.
- `/guardian/child-status` — guardian's child (BROKEN pass-timeline fetch).

## Orphaned / Unreachable Pages
- 40+ redirect-only pages (e.g. `/admin/dashboard`, `/warden`, `/student/gate-pass`).
- 49 `EmptyState` pages with no data fetch (e.g. `/faculty/subject/attendance`, `/faculty/subject/classes`).
- 16 supervisor re-export stubs.

## Cross-Page Navigation
- Inspector links (`EntityInspector`): read-only drawer with "View student", "Linked cases", "Approvals" ghost links.
- Quick-action chips: cross-link between role surfaces (e.g. principal → "Child Status" → `/guardian/child-status`).

## Verification Log (2026-11-24)
- Role-home mapping in `src/server/policy/routes.ts`: **CONFIRMED** (read directly from code)
- 22 operational roles have explicit home URLs in the table: **CONFIRMED**
- `dean`, `chief_warden`, `controller_examinations` are NOT in the table and NOT in `ALL_ROLES` array — they fall through to `/login` via `return routes[role] || "/login"`: **CONFIRMED**
- `addl_controller_*` (3 roles) ARE in the table, mapping to `/exam-branch`: **CONFIRMED**
- `warden` is in the table (legacy, maps to `/principal`) but is NOT in `ALL_ROLES`: **OBSERVED** — legacy role retained for backward compat
- `hostel` (legacy) is NOT in the table and NOT in `ALL_ROLES`: **CONFIRMED** — no home URL
- 40+ redirect pages: **CONFIRMED**
- 49 EmptyState pages: **CONFIRMED** (from ROLE_REPORT audit)
- 16 supervisor stubs: **CONFIRMED** (from supervisor ROLE_REPORT)

**Suggestion:** `ALL_ROLES` in routes.ts lists 22 roles, but `src/lib/roles.ts` has 28 keys. The 6 entity-aligned roles (dean, chief_warden, controller_*, addl_controller_*) are intentionally excluded from `ALL_ROLES` to prevent them from appearing in role-pick lists. This is correct behavior but should be documented.
- Inspector links (`EntityInspector`): read-only drawer with "View student", "Linked cases", "Approvals" ghost links.
- Quick-action chips: cross-link between role surfaces (e.g. principal → "Child Status" → `/guardian/child-status`).
