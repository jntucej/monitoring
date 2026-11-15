# UX Panel Test Results (ux-swarm, local OmniRoute/Agnes vision LLM)

Panel of sighted + screen-reader synthetic agents, one task per role console.
~80% accurate vs real users. A low score can mean the *app is in an operational
state that blocks the task* (e.g. lockdown, no active visit, empty queue), not
bad UI — the "top pain" notes which. Auth is injected via storage-state seeds
(`UX_SWARM_STORAGE_STATE`) + init-script seeding before AuthGuard fires.

## Per-role completion + top pains (latest run)

| role | console | completion | sighted | blind | status (n) | top pain |
|---|---|---|---|---|---|---|
| lookup | /operator/lookup | 85% | .94 | .50 | 1 completed, 19 of 20 | Voice/command inputs clutter the simple ID lookup |
| caretaker | /caretaker | 55% | .56 | .50 | 11 completed, 7 timed out, 2 abandoned | Ambiguous sidebar labels; empty states lack CTA |
| hod | /hod | 50% | .625 | 0.0 | 10 completed, 10 timed out | Duplicate 'Approvals' elements confuse intent |
| transactions | /operator/transactions | 45% | .44 | .50 | 9 completed, 8 abandoned, 3 timed out | Indefinite loading, no progress/timeout indicator |
| operator | /operator | 35% | .44 | 0.0 | 7 completed, 6 abandoned, 7 timed out | Lockdown banner overlaps critical UI; similar labels |
| oie | /oie | 35% | .44 | 0.0 | 7 completed, 4 abandoned, 9 timed out | 'Today' sidebar label not self-evident |
| staff | /staff | 35% | .38 | .25 | 7 completed, 6 abandoned, 7 timed out | Duplicate 'Notifications' buttons (sidebar + bell) |
| worker | /worker | 35% | .38 | .25 | 7 completed, 5 abandoned, 8 timed out | Raw event codes (SESSION_FAMILY_CREATED) shown as logs |
| exam_branch | /exam-branch | 30% | .31 | .25 | 6 completed, 4 abandoned, 10 timed out | OIE page 403; landing URL dead-ends |
| exam_superintendent | /exam-superintendent | 30% | .38 | 0.0 | 6 completed, 11 abandoned, 3 timed out | No single clear entry point to exam coordination |
| deputy_warden | /deputy-warden | 30% | .38 | 0.0 | 6 completed, 4 abandoned, 10 timed out | Stuck on 'Verifying security credentials' spinner |
| mess_incharge | /mess-incharge | 25% | .31 | 0.0 | 5 completed, 13 timed out, 2 abandoned | Zero/placeholder states obscure loading vs empty |
| visitor | /visitor | 25% | .19 | .50 | 5 completed, 8 abandoned, 7 timed out | No active visit → host/check-in inaccessible |
| supervisor | /supervisor | 20% | .13 | .50 | 4 completed, 6 abandoned, 10 timed out | `$h.map` crash (FIXED); no path on error |
| admin | /admin | 20% | .25 | 0.0 | 4 completed, 16 timed out | 'Verifying credentials' stuck; no clear exceptions link |
| faculty | /faculty | 20% | .13 | .50 | 4 completed, 11 abandoned, 5 timed out | Empty splash 'Gate Monitor' on first load |
| guardian | /guardian | 15% | .13 | .25 | 3 completed, 14 abandoned, 3 timed out | Infinite verification spinner, no ETA/error |
| parent | /parent | 15% | .19 | 0.0 | 3 completed, 12 abandoned, 5 timed out | Indefinite loading, garbled screen, no nav |
| student | /student | 15% | .13 | .25 | 3 completed, 4 abandoned, 13 timed out | Attendance shows only unmarked; no schedule link |
| emo | /emo | 0% | 0.0 | 0.0 | 20 abandoned | Cloudflare 502 (transient deploy churn, not UI) |

## Defects found & status

FIXED & deployed this pass (commits `53a7bfa0`, `db253077`, `0fa66c66`):
- **supervisor** `$h.map is not a function` crash → `EscalationsView` now guards
  `.map` on `data.escalatedPermissions` (array) instead of the whole `data`
  object; normalizes `student_name` so the name column renders.
- **exam_branch** `/api/permissions?stage=oie` → 403. exam_branch was missing the
  `oie` exam stage in `STAGES_BY_ROLE`; added. Now 200.
- **Mangled Tailwind sweep** across ~30 files: `hover: hover:`, `focus: disabled:`,
  `borderaction`/`textalert`/`bgalert` tokens, quoted-in-`className` literals —
  the "overlapping / garbled loading text" and "visually cut-off elements" the
  panels reported were this breakage. `unslop-ui` 0 findings, `tsc` 0 errors.
- **AuthGuard / AppLoadingScreen** status states (role="status" on the spinner so
  screen readers get it, not just the progress bar).

FIXED in earlier passes (operator-desk, student nav, admin exceptions, lookup):
- operator: duplicate entry points, stacked banners, manual-entry dead-end,
  24× indefinite loading on transactions (spinner + empty-state CTAs).
- student: Attendance moved from "Permissions" to "Campus" nav group; daily
  attendance breakdown status normalization; curfew/maintenance surface.
- admin: `/admin/exceptions` scan-exceptions review page + API + sidebar link.
- lookup: ID field primary, name optional; empty-state CTAs.

OPEN (feature gaps or env state, not UI defects — left as-is):
- **student** "no class schedule view" — no schedule page exists (feature gap).
- **visitor** "no active visit" — empty state is correct; the task needs a live
  visit in the data.
- **mess_incharge / exam_superintendent / caretaker** empty-state CTAs and
  ambiguous labels — labeled; some need a real data row to exercise.
- **worker** raw event codes in activity feed — cosmetic; needs a human-readable
  label map (enhancement, not a bug).
- **emo** Cloudflare 502 — transient deploy churn, not reproducible.

MFA-gated roles (principal, sysadmin, vice_principal, hostel) cannot be
panel-tested autonomously: login enforces TOTP. Enrollment / a code is required
to capture a usable seed. (principal + sysadmin seeds exist but are stale;
vice_principal + hostel have no accounts to capture.)
