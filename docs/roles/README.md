# Role Operations & Personalization Docs

Authoritative, source-verified documentation for every role in the JNTUH CEJ
Gate Monitor web app — what each role's pages do, how the workflows flow, which
API endpoints back them, and how user-level customization works.

> Every route and endpoint below was verified against the live source tree
> (`src/app/...`, `src/app/api/...`) and the deployed API. No invented
> endpoints. Live endpoint smoke-test: 13/13 role dashboards return 200.

## Start here

- **[`roles/_overview.md`](roles/_overview.md)** — the map: all roles grouped by
  tier, the shared auth model, the RBAC enforcement points, and links to every
  role doc. **Read this first.**
- **[`roles/customization.md`](roles/customization.md)** — the user-level
  layer: the preference cascade (policy > user > trait > persona > role >
  system), the 91-key registry, traits, explicit settings, and the
  `/api/preferences` + `/api/traits/context` endpoints.

## Per-role manuals (one file each)

| Area | Roles |
|---|---|
| Governance | `admin` · `sysadmin` |
| Students & constituents | `student` · `parent` · `guardian` · `visitor` |
| Faculty & staff | `faculty` · `staff` · `worker` · `operator` |
| Campus / hostel / mess / security | `caretaker` · `hostel_manager` · `deputy_warden` · `mess_incharge` · `supervisor` · `emo` |
| Approvers | `hod` · `oie` · `exam_branch` · `exam_superintendent` |
| Senior / institutional | `principal` · `vice_principal` · `chief_warden` (role context) · `dean` |

DB-only roles (`controller_examinations`, `addl_controller_*`) have no
dedicated console and are documented inline in the senior-role docs.

## How to read a role file

Every role file has the same six sections:

1. **Overview** — who the role is and what they use the app for.
2. **Pages & workflows** — the route tree, grouped, with step-by-step flows.
3. **Key API endpoints** — a table of the endpoints that back the pages.
4. **Data flow** — what fires on load, what mutations POST, any SSE/live streams.
5. **Security notes** — RBAC boundary, what the role *can't* do, fail-open/closed.

## Shared facts that apply to all roles

- **Auth:** JWT access token (HttpOnly cookie + Bearer header) + rotating
  refresh token; `/api/auth/session` revalidates.
- **RBAC:** server-side `withAuthorization` in every API handler + client
  `<AuthGuard allowedRoles=[...]>` per page.
- **Internal IDs:** the human identifier (roll / unique_id / email) is shown to
  everyone; the internal UUID is shown **only to `sysadmin`**.
- **Dashboard split:** student home varies by **persona** (day_scholar vs
  hosteller), not by gender; gender only gates the sakuga theme + SakugaControls.
