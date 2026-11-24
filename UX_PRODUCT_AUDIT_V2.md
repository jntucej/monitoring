# UX & Product Audit V2.0

**Project:** mycampus — JNTUH UCEJ Campus Access & Gate Monitor
**Repository:** `/opt/monitoring/compose`
**Mode:** Read-only audit. No source files were modified.
**Scale inspected:** 445 page routes, 41 layouts, 669 API routes, 21 role configs, 128 shared components.

> **Verification note.** Findings marked `RETIRED` were raised in a prior draft of this audit and were re-verified against the current on-disk source and found no longer present. They are documented for traceability, not as open issues.

---

## 1. Executive Summary

The product is a campus operations platform: physical gate scanning, a multi-stage pass/leave approval machine, hostel/mess/facilities operations, academics, examinations, visitor management, and platform administration. Its deepest strengths are where the "Information → Decision → Action" loop is closed: the gate kiosk (`/gate/[gateId]`), the principal approvals register (`ApprovalsView` with `?ticket=` deep-links), student ticket tracking (`/student/permissions`), and the two-phase CSV bulk import.

Its weaknesses are concentrated in four places:

1. **Broken or dead-end actions on the student's core workflow** — an inspector "View details" button that opens nothing, and a pass-page state (`selectedTicket`) that no code path ever populates.
2. **Generic, non-role-specific home stacks** — 16 home pages stack 4–7 shared retention widgets (TaskContinuity, UnifiedCampusCalendar, QuickActions, NotificationCenter, …) that add little decision value for operational or one-time users.
3. **Five template pages that present only aggregate counters** ("OIE Handoff data streams from the campus gate network") with no records and no action, despite the underlying permission/workflow data being available.
4. **Inconsistent shell and queue implementations** — 15 layouts use the shared `RoleResponsiveShell`; the rest use bespoke shells (Principal, HOD, VP, Admin, SysAdmin, Operator, OIE, exam-branch, exam/superintendent, guardian). The same "review a ticket" job is served by at least three different queue components with different bulk-action capabilities.

**Overall maturity: Level 3 (workflow application) with pockets of Level 4 (decision support).** The approval chain, SLA countdowns, escalation, delegation, and exam-day coordination are real workflow machinery. What the product lacks is consistency: the same job done four different ways, and several surfaces that stop at "here is a number" instead of leading to a decision and an action.

## 2. Audit Scope

- All 445 routes under `src/app` (406 real pages, 39 redirect shims).
- All 41 layouts, the shell family (`RoleResponsiveShell`, `PrincipalDesktopShell`, `HodDesktopShell`, `VPDesktopShell`, `AdminSidebar`, `SysAdmin Sidebar`, `OperatorShell`), and the role config system (`src/config/roles/*`).
- Key components: `PermissionList`, `ApprovalsView`, `ApproverDecisionQueue`, `KanbanBoard`, `EntityInspector`, `ContextSituationBar`, `PassCreateFormV2`, `PassHub`, `ComplaintConsole`, `Scanner`, `DataTable`.
- API namespaces (93 top-level) vs UI usage.
- States: loading (`PageLoading`, skeletons, `WidgetBoundary`), empty (`EmptyState`, `RoleEmptyState`, `LifefulZeroState`), error (`ErrorRecoveryBanner`, `describeApiError`), offline (student home banner + retry), polling cadence, permission gates (`AuthGuard`, `TeachingBindingGate`, `LockedByPolicy`).
- Accessibility: landmarks, keyboard handlers in `DataTable`, focus-visible tokens, `min-h-11`/`min-w-11` touch targets, `role`/`aria` attributes.
- Verification method: static analysis of source (grep, regex, file reads), not a running app. UI-level claims are marked **Confidence: Medium — requires human validation** where the rendering was not observed.

## 3. Project Mental Model

The app models one physical campus around four pillars:

1. **Physical access.** Gate operators scan QR/1D barcodes at `/gate/[gateId]` (IN/OUT decisions, flagged-scan confirmation, manual-entry fallback, geofence warning, shift clock). Supervisors watch a live gate wall and resolve escalations. Visitors self-serve request → approval → check-in/out.
2. **Permission & leave machine.** A student or guardian submits a request (`PassCreateFormV2`, config-driven by `PassTypeConfig` and persona). The ticket moves through stage-scoped queues (`/api/permissions?stage=X&status=Y&workflow_type=Z`) across caretaker → deputy warden → hostel manager → faculty/HOD → vice principal → principal (warden) → OIE/exam-branch. Decisions are approve / reject / forward / delegate; SLA deadlines attach to stages; approved hostel passes mint a QR gate pass.
3. **Campus living & academics.** Hostel rooms/beds, housekeeping, complaints (a shared `ComplaintConsole` per role), mess token scanning and meal counts, faculty class attendance, class requests, exam schedule, OIE clearances, exam-branch handoff bundles.
4. **Governance & platform.** Admin user/gate/policy management, campus-split audit trail, sysadmin infrastructure (health, Docker services, backups, cron, webhooks, feature flags, runbooks, compliance).

Cross-cutting: config-driven roles (21 roles, `when(ctx)` predicates over a `WorkspaceContext`), a `GlobalEntityInspector` progressive-disclosure drawer mounted in nearly every console, `LiveEventToaster` + `NotificationBell` for alerts, and a command palette.

## 4. Product Structure

```
mycampus (Next.js 16 App Router, React 19, Supabase/Postgres, Tailwind v4)
├── Marketing shell            /, /login, /about, /help, /support, /reset-password, /campus
├── Student console            /student/*  (32 nav links, persona-aware home)
├── Guardian console           /guardian/* (legacy-style console + 6 retention widgets)
├── Approver group             /principal/*, /vice-principal/*, /hod/*, /faculty/*,
│                              /oie/*, /deputy-warden/*, /hostel-manager/*, /caretaker/*,
│                              /staff/*, /emo/*, /exam/permissions/*, /permissions/[ticket]
├── Frontline                  /gate/[gateId] (kiosk), /operator/*, /worker/*, /supervisor/*
├── Mess                       /mess/* (scan, menus, inventory, issues, requests, reviews)
├── Exam operations            /exam-branch/*, /exam/superintendent/*
├── Visitor portal             /visitor/*
├── Admin                      /admin/*
└── SysAdmin                   /sysadmin/*
```

## 5. User Roles

22 role configs in `src/config/roles/`: student, guardian/parent, faculty, hod, principal (= "warden" for gate duties — a single person who is the Principal), vice_principal, operator, worker, supervisor, deputy_warden, hostel_manager, caretaker, mess_incharge, admin, sysadmin, visitor, emo, exam_superintendent, exam_branch, oie, staff, exam-related exam permissions. Each config defines identity (accent color, motion preset), vocabulary, home widgets, empty/loading copy, a bot persona, onboarding script, and `when(ctx)`-gated nav + capabilities + approval stages.

## 6. Jobs-to-be-Done (by role)

- **Student:** "When I need to go out or stay home, I want to submit a pass/leave request and know its stage, so I can plan my movement." / "When I'm at the gate, I want to show a valid QR, so I can enter/exit without delay."
- **Guardian:** "When my child is on campus, I want to know they're safe and where they are, so I can act if something is wrong." / "When my child needs a pass, I want to consent or submit on their behalf, so the leave is honored."
- **Gate Operator:** "When a student presents a code, I want to verify and record IN/OUT in under a few seconds, so the queue moves and exceptions get flagged, not swallowed."
- **Supervisor:** "When a gate is offline or a scan is flagged, I want to see it, dispatch a resolution, and hand over cleanly, so the post stays covered."
- **HOD / Deputy Warden / Hostel Manager / Caretaker:** "When requests or complaints land at my stage, I want to review, decide, or forward with full context, so nothing stalls or escapes my remit."
- **Vice Principal / Principal (Warden):** "When something is overdue, escalated, or an emergency, I want a short priority queue and the ability to decide or delegate, so institutional risk is contained."
- **Mess In-Charge:** "During the meal window, I want to verify tokens and reconcile declared vs served counts, so meals are accounted for and issues are logged."
- **OIE / Exam Branch / Superintendent:** "On exam day, I want candidate clearances verified and handed off, so the exam runs without access disputes."
- **Visitor:** "When I'm expected on campus, I want my visit approved and check-in/out to be simple, so I'm not turned away at the gate."
- **Admin / SysAdmin:** "When the institution or the platform needs configuration or repair, I want safe, audited, reversible controls, so I can act without breaking operations."

## 7. Role × Job × Action Matrix

| Role | Job | Information needed | Decision | Action | Current UX | Gap |
|------|-----|--------------------|----------|--------|------------|-----|
| Student | Track & act on requests | Stage, SLA, outcome | Reapply? Show QR? | Reapply, view pass, present QR | `/student/permissions` works; inspector CTA dead (UX-003); pass pivot inert (UX-004) | 2 broken transitions |
| Guardian | Monitor ward | Live campus status, movement | Consent / contact | Approve, submit leave | Console + 6 generic widgets bury the ward-status first thing | Priority inversion |
| Gate Operator | Scan & record | Identity, pass validity, gate mode | IN / OUT / deny | Confirm, manual entry | Strong kiosk; camera fallback solid | — |
| Supervisor | Triage escalations | Open items w/ SLA, gate wall | Resolve / assign / handover | Decision + handover | `FocusZone` + 6 retention widgets below | Priority inversion |
| HOD | Approve dept requests | Ticket context, SLA | Approve / forward | Decide | `ApprovalsView` (no bulk) | No bulk; queue inconsistency |
| Deputy Warden | Hostel leave L2 | Leave queue, consent | Approve / forward | Decide, forward | `PermissionList` (bulk + forward) | Inconsistent w/ HOD/Principal |
| Hostel Manager | Allocation & complaints | Rooms, residents, tickets | Assign bed / worker | Allocate | **Allocation panel is non-functional** (no API) (UX-005); `HostelAdminFallback` redirects to admin | Dead capability |
| Mess In-Charge | Meal reconciliation | Declared vs served | Serve / log issue | Scan, count | `/mess/scan` strong; home stacks generic widgets | Home bloat |
| OIE | Exam-day queue | Clearances, escalations | Approve / escalate | Decide | `ApprovalsView`-style queue | KPI tiles not drillable (UX-006) |
| Exam Branch | OIE handoff | Pending exam tickets | Forward bundle | Batch forward | **Counter-only page** (UX-001) | Records/action missing |
| Principal | Executive triage | Overdue, escalated, emergency | Decide / delegate | Act | `ApprovalsView` + deep links | KPIs not drillable; home bloat |
| Visitor | Check in/out | Approval state, host | Proceed | Check in/out | Clear card; **404 profile link** (UX-002); widget bloat | Broken nav link |
| Admin | Manage institution | Users, gates, audit | Configure | CRUD, export | Two-phase CSV import strong | — |
| SysAdmin | Platform ops | Health, alerts, services | Remediate | Restart, backup | Command center + drawers | Retention widgets on command center |

## 8. Information Architecture Audit

**Findings**

- UX-002 — Visitor sidebar 404 (`/visitor/profile` does not exist; `hasProfile: false` present in manifest but the shell still renders the link — see Evidence below). **Correction on re-verification:** `/visitor/layout.tsx` *does* now set `hasProfile: false`, and `RoleSidebar` suppresses the link when `hasProfile !== false` is false… Re-reading `RoleSidebar.tsx`: the footer link is gated by `manifest.hasProfile !== false`. With `hasProfile: false` the link is **suppressed** — so the 404 finding is **RETIRED** for the visitor role. The same flag is set on all 15 `RoleResponsiveShell` manifests, so no dead profile links there. (Retained only as a note: any *new* role console must remember the flag.)
- UX-007 — Student nav now gates the Passes & Requests group on `isHosteller` (verified: `when: isHosteller` on lines 20–24 of `student/_shell/nav.ts`). The earlier "all 32 links leak to day scholars" finding is **RETIRED**. Residual observation: the *Mess & Dining* group (5 links) is **not** gated — day scholars presumably eat in the mess, so this is likely intentional; noted under Unresolved Questions.
- The approver surface is split across 4 route trees (`/(approver)/*`, `/exam-branch/*`, `/exam/superintendent/*`, `/visitor/*`), each with its own `_shell` — consistent pattern, good. But queue UX differs per role (see UX-008).
- 39 redirect shims consolidate legacy routes (`/student/pass-application`, `/student/leave-requests`, `/student/request-tracking`, `/student/gate-pass`) onto canonical pages — good IA hygiene.
- `ContextSituationBar` appears on 358 pages (up from earlier 242-count; the component is now near-universal). Where it duplicates the `PageHeader` above it, it adds height without new information (see UX-009).

## 9. Navigation Audit

- 15 layouts use the shared `RoleResponsiveShell` (single mount, drawer on mobile, one `#main-content`). **The earlier "20 layouts double-mount `{children}`" finding is RETIRED** — a project-wide migration to `RoleResponsiveShell` was completed (its own docstring states it exists to prevent duplicate landmarks/fetches).
- Remaining bespoke shells: Principal (`PrincipalDesktopShell`), HOD (`HodDesktopShell`), VP (`VPDesktopShell`), Admin (custom `AdminSidebar` + drawer, single-mount), SysAdmin (custom `Sidebar` + drawer, single-mount), Operator (`OperatorShell`, kiosk mode strips chrome), OIE, exam-branch, exam/superintendent, guardian. All now single-mount `{children}` — verified.
- **Residual duplicate-landmark risk:** `RoleResponsiveShell` renders **two** `RoleNotificationBell`s — one in the mobile header and one fixed on desktop — plus two `RoleChrome` instances (footer/mobile). Both are in the DOM simultaneously and toggled by CSS. `NotificationBell` is a data-polling component (mounts its own fetch/poll per instance). So each responsive-shell console runs **two independent bell pollers** and mounts the notification bell's `EntityInspector` wiring twice. **UX-010.**
- `RoleDesktopShell`/`RoleMobileShell` (the old pair) still exist on disk but are referenced only in comments/docs (`AuthGuard.tsx`, `RoleChrome.tsx`) — dead code, not mounted by any layout. **Polish / technical debt.**

## 10. Page-by-Page Audit

Key pages assessed (full trace in §11–§12): `/`, `/login`, `/forbidden`, `/student`, `/student/passes`, `/student/permissions`, `/student/permissions/new`, `/guardian`, `/gate/[gateId]`, `/operator/manual-entry`, `/supervisor/home`, `/principal/home`, `/principal/approvals/*`, `/hod/approvals/pending`, `/deputy-warden/leave-requests`, `/hostel-manager/home`, `/hostel-manager/allocation`, `/mess`, `/mess/scan`, `/exam-branch/oie-handoff`, `/staff/requests`, `/staff/history`, `/caretaker/workers`, `/hostel-manager/housekeeping-tasks`, `/visitor`, `/admin/audit-logs`, `/admin/students/import`, `/sysadmin` (Command Center).

**Strengths observed**

- `/gate/[gateId]`: explicit two-decision rule (IN / OUT only), no auto-confirm, flagged scans always cost a deliberate tap, stats/logs live on separate pages, FloatingBot suppressed on the kiosk. A model operational surface.
- `/admin/students/import`: two-phase validate → preview → commit with skip-errors and roll-immutability; a rare complete "dangerous bulk op done right" pattern.
- `/student/permissions`: status filters with counts, reject → "Reapply (creates a new ticket)" affordance, `PermissionDetailPanel` + `EntityInspectorPanel` — the *page* workflow is genuinely complete; only the inspector CTA is broken (UX-003).
- `/mess/scan`: full state machine (idle/loading/result/error), manual code entry, veg/non-veg, duplicate-serve handling.
- `ApprovalsView`: `?ticket=` deep-links that fetch the ticket even when it's not in the current status register — deep-link survival handled explicitly.

**Weaknesses**

- The 5 "data-wall" template pages (UX-001), the dead inspector CTA (UX-003), the inert pass pivot (UX-004), the non-functional allocation panel (UX-005), non-drillable KPI tiles on OIE/EMO/HOD/Supervisor homes (UX-006).
- 16 home pages stacking 4–7 retention widgets (UX-011).

## 11. Workflow Audit

### W1 — Student pass lifecycle (complete except two dead ends)

```
Goal: outing/home leave approved and usable at gate
Entry: /student → "New Request" (or /student/permissions/new; legacy shims redirect here)
Form: PassCreateFormV2 — persona-scoped fields, attachment upload, approval-chain preview
Submit: POST /api/permissions → ticket created
Track: /student/permissions → filter by status → card select → EntityInspector
  → "View details" CTA … dead (UX-003)
Present: /student/passes → PassHub (active QR) + PassHistory + MyDocuments
  → "Focus a document" toggle … inert state, never set (UX-004)
Gate: /gate/[gateId] scan → pass validated → IN/OUT recorded
```
Broken links: the inspector→detail-panel handoff (UX-003) and the document-focus pivot (UX-004). Everything else in the chain is wired.

### W2 — Approver triage (consistent deep-linking, inconsistent queues)

```
Entry: role home (FocusZone / MorningBrief surfaces top priority item)
Queue: /principal/approvals/{pending,escalated,overdue,delegated} → ApprovalsView (DataTable + inspector)
      /deputy-warden/leave-requests → PermissionList (search, status filter, bulk bar, forward)
      /hostel-manager home → KanbanBoard (PENDING/ESCALATED/APPROVED/REJECTED columns + inspector)
Deep link: notification email → /permissions/[ticket] or ?ticket= → inspector opens even out-of-register
Action: approve / reject / forward / delegate (+ bulk on PermissionList & ApproverDecisionQueue only)
```
The same job has three queue implementations with different capability sets — no bulk on `ApprovalsView`, bulk on `PermissionList`/`ApproverDecisionQueue`, neither on `KanbanBoard`. **UX-008.**

### W3 — Gate operation (strong)

```
Scan → flagged pass? ConfirmSheet (deliberate tap) → IN/OUT → SuccessFlash / log
Camera fails → "Can't see the code?" → /operator/manual-entry → lookup (roll or voice prefill) → record with entryType
Exception → /operator/exceptions; handover → /operator (DigitalHandover) / supervisor shift/handover
```
No broken transitions found; see §23 for the polling vs WS note.

### W4 — Exam-day clearance (broken at the handoff surface)

```
Exam Branch: verify candidates → /exam-branch/oie-handoff → SHOULD batch-forward bundles
Observed: page shows only "Live / Last Updated / Records: N" counters and a back link.
          No ticket list, no forward action, despite fetching /api/permissions?workflow_type=exam&status=PENDING&stage=oie
```
**UX-001** — the handoff (the whole point of the page) cannot be performed there.

### W5 — Guardian ward monitoring (priority inversion)

```
Entry: /guardian (console shell)
Content: 6 retention widgets (PersonalizedCampusHome, TaskContinuity, UnifiedCampusCalendar,
        ActivityTimeline, QuickActions, NotificationCenter, AttentionQueue) + ward cards
Need: "Is my child on campus right now?" answered FIRST
```
The reassurance check is buried under engagement widgets. **UX-011** (guardian instance).

### W6 — Complaint lifecycle (role-consistent, good)

`ComplaintConsole` is shared across student/caretaker/emo/hostel-manager/deputy-warden; category and routing config lives server-side (`/api/complaints/categories`, routing rules in `src/lib/complaint-routing.ts`). Each role's `[id]` page renders the same `ComplaintDetail`. The EMO variant is 6 lines (thin wrapper) — acceptable given shared component, but the wrapper provides no EMO-specific status context.

## 12. Information → Decision → Action Audit

| Surface | Information | Expected decision | Expected action | State |
|---|---|---|---|---|
| `/student/permissions` inspector | Ticket stage history, SLA, status | "Open the full ticket" | "View details" button | **Broken** (UX-003) |
| `/student/passes` docs section | Documents per pass | "See this pass's next steps" | Focus toggle → SelfActionLoop | **Inert** (UX-004) |
| `/exam-branch/oie-handoff` | Pending count | "Forward the bundle to OIE" | Batch forward | **Missing** (UX-001) |
| `/staff/requests`, `/staff/history`, `/caretaker/workers`, `/hostel-manager/housekeeping-tasks` | Pending counts only | "Review / resolve specific requests" | Open a record | **Missing** (UX-001) |
| `/hostel-manager/allocation` | "Managed centrally by admin" | "Assign a bed" | Drag student → bed | **Blocked** — no rooms API; panel hard-returns empty (UX-005) |
| `/oie`, `/emo`, `/hod`, `/supervisor` home KPI tiles | Counts (pending, escalated, today's decisions…) | "Drill into the number" | Click tile → queue | **Partial** — only Principal's tiles accept `linkHref`; the other four KpiTile defs are plain divs (UX-006) |
| `/visitor` | Approval state + host | "Check in/out" | CTA | Works; but 4-card grid duplicates CTAs already in the ContextSituationBar |
| `/mess` KPIs | Declared/confirmed/rate | "Reconcile the meal day" | Click KPI → inspector | Works (onClick wired) |
| `/admin/analytics/*` | Charts/metrics | "What's driving this number?" | Drill to records | Thin 14–24-line wrappers; no drill-through links observed (UX-001 family, lower confidence) |

## 13. Dead / Passive Page Audit

## Page: `/exam-branch/oie-handoff` (and 4 sibling "data-wall" pages)

**Why it feels passive:** renders only three status cards (Live / Last Updated / Records: N) plus a back link. The fetch is real (`/api/permissions?workflow_type=exam&status=PENDING&stage=oie`) but the response array is never rendered as records and no action is offered.
**Information provided:** counts + freshness claim.
**Expected user decision:** which pending exam clearances to batch-forward to OIE.
**Expected next action:** select tickets → forward bundle.
**Does that action exist?** No — on the page. The queue is presumably reachable at `/exam-branch` (Pass Queue) but the handoff action itself is not here.
**Problem:** a user arriving to *perform* the handoff is shown a dashboard, not a task surface. The "data streams from the campus gate network" copy (shared verbatim across 5 pages: oie-handoff, staff/requests, staff/history, caretaker/workers, housekeeping-tasks) asserts liveness the UI does not demonstrate.
**Minimal improvement:** render the fetched pending items as a simple list with ticket + student + reason, and a "Forward to OIE" bulk action (the API and the OIE-side queue already exist: `/(approver)/oie/queue/*`).
**Advanced improvement:** batch-select with per-item verification state, handoff receipt (who/what/when), and a follow-up link to OIE's queue so the sender can watch completion.
**Confidence:** High (code read; UI not observed).

## Page: `/hostel-manager/allocation`

**Why it feels passive:** "Bed allocation" is the role's signature job; the page shows a `HostelAdminFallback` card saying beds are managed in the admin console, while the `AllocationPanel` drag-drop grid is wired but its data loader **hard-returns `{status:"empty"}`** because no rooms/beds API is available to the hostel_manager role.
**Information provided:** none operational.
**Expected user decision:** allocate a student to a block/room/bed.
**Expected next action:** drag student onto bed.
**Does that action exist?** Partial — the interaction exists (drag/drop → `PATCH /api/students/[roll]`) but the data source is absent, so the affordance is a permanent empty state.
**Problem:** a functional-looking empty state that can never be filled from this role is worse than an honest "not available" — it promises a capability the role cannot complete.
**Minimal improvement:** replace the dead grid with an explicit status ("Room/bed data is maintained by Admin — request a reallocation below") plus an actionable path (a request/forward action to admin).
**Advanced improvement:** expose a read-only rooms/beds endpoint scoped to hostel_manager, and a request-based allocation flow (student → manager approves) rather than direct drag.
**Confidence:** High.

## Page: `/admin/analytics/*` (advanced, occupancy, predictive, sustainability, traffic, users)

**Why it feels passive:** 14–24-line wrapper pages over a shared analytics engine; observed structure shows metric display without drill-down links to the underlying records (e.g., occupancy % → which hostel/rooms; traffic → gate logs).
**Expected user decision:** "Where is the anomaly?"
**Expected next action:** inspect the affected records.
**Does that action exist?** Not found in the pages (no record links observed).
**Minimal improvement:** each KPI/chart carries one link to the filtered operational list (occupancy → `/admin/occupancy` with params; traffic → `/admin/gates` activity).
**Confidence:** Medium — requires human validation of the shared analytics component's links.

## Page: role home pages with retention stacks (16 pages)

See UX-011. Passive in the sense that engagement widgets displace the operational queue rather than support it.

## 14. Fake Completeness Audit

- **OIE handoff, staff requests/history, caretaker workers, housekeeping tasks** — "N pending" counters imply a queue is available; the records are not shown (UX-001). Functional completeness (API) ≠ workflow completeness (no task surface).
- **Allocation panel** — drag-drop affordance around an empty data source (UX-005).
- **5 home pages** — KPI tiles that look interactive (hover styles on Principal) vs four identical plain tiles elsewhere (UX-006): visual affordance without behavior is a trust problem.
- **`/mess` dashboard KPIs** — the "Live" card pattern echoes the data-wall template; but mess KPIs *do* wire `onClick → inspect`, so mess is complete; the 5 template pages are not.
- **Audit logs** — "All" scope is sysadmin-only and the viewer states the constraint explicitly (good anti-pattern avoidance: the UI says what it can't do).

## 15. Interaction Audit

- `ConfirmDialog`: 3 variants, proper button semantics; used for destructive confirmations. Good.
- `DataTable`: keyboard-operable rows (`role="button"`, Enter/Space), sticky first column, mobile card fallback — a strong base; **no built-in sort/pagination/search**, so each consumer re-implements (inconsistency source; see §25).
- `PermissionList` bulk actions: select-all/individual, `BulkActionsBar` with clear — the most complete queue implementation found.
- `ApprovalsView`: row click → inspector; `RoleExportButton` present; no bulk.
- `PassCreateFormV2`: auto-fills "to" from "from" + duration config; approval-chain preview before submit — good decision support.
- `ShakeDetector` (auto-files T1 bug complaint on device shake) — present on all non-marketing pages; novel, but a *bug-reporting* affordance with no discoverability; noted only.
- No-op interactions: UX-003 (inspector CTA), UX-004 (inert `selectedTicket`).

## 16. Micro-Interaction Audit

- **SlaCountdownPill / SlaBadge** — time-sensitive decision support on queues (good; used by `ApproverDecisionQueue`).
- **`LiveFreshnessBar` / `DataFreshness`** — "last fetched" signaling; `DataFreshness` used on only 3 pages (principal home, admin overview, admin students). Most polling pages (30s/60s cadences found on 95+ call sites) show **no freshness indicator** — a user cannot tell how stale a number is. **UX-012.**
- **HoverPreview + MetricPreview** on Principal KPI tiles (progressive disclosure); absent on the other 4 KpiTile implementations.
- **`HoverPreview` on mess KPIs** — wired.
- **WhatHappenedReceipt / SmartCrossLinkChip / ContextualActionRow** in `ApproverDecisionQueue` — "what changed" receipts and cross-links; strong, but confined to that one queue component.

## 17. State Audit

| State | Coverage | Gaps |
|---|---|---|
| Initial / Loading | `PageLoading`, `ListSkeleton`, per-widget `WidgetBoundary` fallbacks | Good |
| Empty | `EmptyState`, `LifefulZeroState`, `RoleEmptyState` | Good; allocation panel empty-state is misleading (UX-005) |
| Success | Toasts (`useUIStore`/`ToastProvider`), `SuccessFlash` on kiosk | Good |
| Error | `ErrorRecoveryBanner` + `describeApiError` (401/403/404/409/423 mapping with guidance) — excellent pattern | Used by pages that import it; the 5 data-wall pages use a custom amber banner with Retry instead (inconsistent) |
| Processing | In-flight refs on login (`inFlightRef` double-submit guard), `busy` states | Good |
| Offline | Student home banner + retry re-mounts; kiosk offline banner | Offline handling is **student + operator only**; approver consoles have no offline affordance (acceptable if desktop-first, but a warden on a site trip is mobile) |
| Stale data | `DataFreshness` on 3 pages only | UX-012 |
| Permission denied | `AuthGuard` redirect; `TeachingBindingGate` ("no teaching assignment" + who to contact — good); `LockedByPolicy`; `/forbidden` | **UX-013:** `/forbidden` copy says "administrative role" and falls back to `student` |
| Destructive | `ConfirmDialog` variants; CSV commit phase-2 | Good |
| Retry | Retry buttons on banners; polling refresh | Good |

## 18. Forms & Data Entry Audit

- `PassCreateFormV2` — config-driven fields; attachment upload; chain preview. Strong.
- CSV bulk import — validate → preview → commit; template download; skip-errors toggle. Strong.
- Anti-ragging report — anonymous flag, category/severity, narrative/location; success state files a case number. Good; note the page contains a **duplicate `"use client";` directive** (lines 1–3) — see §25 polish.
- Manual entry (operator) — entry-type default + warning when stored type differs (documented fix §MANUAL-ENTRY-1 in code comments). Good.
- `ContextSituationBar` forms? N/A. Form error presentation is inline per-field in `PassCreateFormV2` (validation from `PassTypeConfig`); API-level errors surface via toasts.

## 19. Search / Filter / Sort Audit

- `PermissionList`: search + status filter + bulk select — the only full-featured queue.
- `ApprovalsView`: `ActiveFilterBar` + `?workflowType=` KPI drill-down; status is a fixed page parameter (pending/escalated/overdue/delegated pages). No in-page status filter.
- `AdminAuditLogViewer`: campus/all scope, pagination (25/page), CSV export.
- `DataTable`: no sort/pagination/search primitives — consumers must build their own, producing the inconsistency above. **UX-014.**
- Student `/permissions`: status filter chips with live counts. Good.
- No saved views / persistent filters anywhere found (opportunity, §29).

## 20. Authorization & Role UX Audit

- Role gating is config-driven (`hasCapability`, `when(ctx)`), with fail-closed security caps / fail-open UX caps — clean model.
- `TeachingBindingGate` on faculty layout: "binding beats role" — a principal with a class binding enters the same scoped faculty pages. The denial state names who to contact. Good.
- `AuthGuard` allowedRoles per layout; `LockedByPolicy` component for policy-locked features.
- **Weakness:** the audit-trail page explains scope in prose ("Switch to All scope (sysadmin-only)") rather than showing a disabled state with a reason; acceptable.
- **Weakness:** `NotificationBell` silently goes inert for 12 roles not in `BELL_SUPPORTED_ROLES` (documented in code) — a warden/hostel-manager visiting the bell sees nothing and no explanation. **UX-015** (minor).

## 21. Accessibility Audit

- Skip-link present (`#main-content`); single `main` per responsive shell after migration (verified in `RoleResponsiveShell`, `PrincipalDesktopShell`, admin/sysadmin layouts).
- `DataTable` rows: keyboard activation, sticky column, `role="button"`.
- Touch targets: `min-h-11 min-w-11` (44px) used consistently on nav triggers — **the earlier "109 files use invalid `min-h11`" finding is RETIRED** (verified: 0 occurrences on disk; all correct `min-h-11`).
- **Invalid utility classes in `/login/page.tsx`: `w128 h128` and `w112 h112`** (blur blobs) — no such Tailwind utilities exist; the decorative blobs have zero size/position effect as written. Visual only, but it means the login "cinematic" backdrop renders differently than intended. **UX-016** (polish).
- `aria` usage: `aria-label` on icon buttons, `role="alert"` on error banners, `aria-describedby` for KPI tiles (RC11/AX4 comment). Good.
- **Duplicate `#main-content` landmark in `RoleChrome`/shell pairs:** `RoleResponsiveShell` renders one `main` (good), but `RoleChrome` variant="footer"/"mobile" render *inside* the main scroll region — verify no second `main` there (not observed in the files read; Confidence: Medium).
- Color tokens: light/dark + `sakuga` theme via CSS vars; contrast notes in comments show intentional WCAG work (5.4:1 muted text).

## 22. Responsive UX Audit

- `RoleResponsiveShell`: sidebar → drawer below `lg`, top bar + hamburger, safe-area padding — workflow survives mobile (queues use card layouts via `DataTable mobileLayout="cards"`).
- Kiosk `/gate/*`: deliberately zero-chrome, full-bleed camera; FloatingBot suppressed; thumb-reachable IN/OUT bar. Mobile workflow complete for the core job.
- `DataTable` mobile card fallback + `stickyFirstColumn` for roll/ticket columns.
- **Risk:** approver consoles on tablet (warden on the floor) get the same widget stacks as desktop; with the retention bloat (UX-011) the queue is far down on a small screen.
- 3-column exam/mess grids collapse to 1 column; acceptable.

## 23. Performance-as-UX Audit

- **Polling cadence:** 30s intervals on ~73 call sites, 60s on 22, 15s on 7, plus per-widget independent polling. Each widget fetches independently; the admin/sysadmin layouts poll `/api/admin/overview` every 30s *in the layout* while sub-pages poll their own endpoints — duplicate aggregator + per-page traffic.
- **WS endpoint exists** (`/api/ws` route tree) but **zero UI references found** — real-time capability is unused; everything polls. **UX-017** (capability gap).
- **Duplicate bell pollers:** `RoleResponsiveShell` mounts `NotificationBell` twice per console (mobile header + desktop fixed), each with its own fetch/poll. **UX-010.**
- `useApiResource` TTL caching mitigates some (30s/60s ttls observed); `clearCache()` patterns exist.
- No lazy-loading of retention widgets observed on home pages (they import eagerly, unlike the FloatingBot which *is* dynamically split).
- Static marketing home (`force-static` + CDN) is well-optimized; the `S:0` unhide history in root layout shows real LCP care.

## 24. Cognitive Load Audit

- **Retention stacks** (16 home pages, 4–7 widgets): PersonalizedCampusHome, TaskContinuity, UnifiedCampusCalendar, RoleAnalytics, ActivityTimeline, QuickActions, NotificationCenter, AttentionQueue, DigitalHandover — identical widget vocabulary across roles with different jobs. For a gate operator or a visitor, "Task Continuity" and "Unified Campus Calendar" are pure noise.
- `ContextSituationBar` on 358 pages: when it restates the `PageHeader` title/subtitle plus CTAs that the hero card below already shows, it is a third statement of the same thing. **UX-009.**
- 32-link student nav (gated now for hostel items) is still 6 groups / ~27 visible links for a day scholar — heavy for mobile.
- `getRecommendedActions` (deterministic next-action rules in `PersonalizedCampusHome`) is good decision support but sits *below* the fold under other widgets.

## 25. Design System & Consistency Audit

- **UI primitives** (`src/components/ui`: `DataTable`, `badge`, `button`, `card`, `input`, `modal`, `select`, `skeleton`, `table`, `toast`) — hand-rolled, no component library; consistent tokens in `globals.css`.
- **Three queue patterns** for one job (`ApprovalsView` / `PermissionList` / `KanbanBoard`) with divergent bulk capabilities — **UX-008.**
- **Five KpiTile implementations** (one drillable, four plain) — **UX-006.**
- **Duplicate `"use client";`** in 4 files (`/(student)/student/anti-ragging/page.tsx` lines 1 & 3, plus 3 admin pages) — harmless at runtime (React tolerates a second directive? Actually a second literal `"use client";` string is just a no-op expression) but a lint/code-quality smell. The *import-before-directive* pattern from earlier drafts is **RETIRED** — a project-wide fix landed; verified 0 violations on disk.
- **Dead shells:** `RoleDesktopShell`, `RoleMobileShell`, `RoleConsole` (1,247-line orchestrator) remain on disk, referenced only in comments — tech debt; any future dev might mount `RoleConsole` thinking it's live.
- **Verbatim-copy templates:** the 5 data-wall pages share identical card blocks and the "streams from the campus gate network" line — template-generated without per-page content.
- **`HostelAdminFallback`** is a well-built honest fallback — the right answer when a capability is genuinely elsewhere; allocation's failure is that it *pairs* that honest card with a *dishonest* empty drag grid.

## 26. Hidden Capability Discovery

| Backend capability | UI exposure | Evidence |
|---|---|---|
| `/api/ws` (websocket) | **Not used** — all surfaces poll | 0 UI references found |
| Delegation APIs (`/api/delegations`, principal `governance/delegations`) | Exposed only to principal; not inline on HOD/VP/deputy-warden queues | 0 direct UI refs to `/api/delegations` |
| Conduct ledger (`/api/conduct`, `ConductLedger` component) | Used in 8 places; not contextually linked from rejected pass tickets or gate exceptions | Component exists; linkage absent |
| Disputes (`/api/disputes`) | 3 UI references; not surfaced in complaint resolution flow | Sparse |
| `SmartCrossLinkChip`, `WhatHappenedReceipt` | Confined to `ApproverDecisionQueue`; other queues (ApprovalsView, KanbanBoard) lack them | Component inventory |
| Exam clearance bundles | OIE-side queue pages exist (`/oie/queue/*`); exam-branch side shows counters only | UX-001 |
| `HoverPreview`/`MetricPreview` progressive disclosure | Principal KPIs only | UX-006 |
| `LiveEventToaster` (SSE/poll→toast, role-gated) | Mounted globally in ClientProviders for non-marketing pages | Present |

## 27. Context Preservation Audit

- **Preserved:** `ApprovalsView` keeps register state when deep-linking a ticket; `?focus=` on student permissions; sidebar expansion state persisted to `localStorage` (`student-nav-expanded` etc.).
- **Lost:** navigating from a home KPI (where drillable) loses the queue; the 5 data-wall pages offer no in-page state to preserve; cross-role links (allocation → admin roster) drop the manager's context with no "return" affordance beyond the fallback card's link.
- **Not found:** filter persistence across pages (a warden's filtered leave queue doesn't survive to another screen). Opportunity, §29.

## 28. Error & Recovery Audit

- `describeApiError` maps 401/403/404/409/423 to human titles + guidance ("Another stage owner updated this record. Refresh to see the latest state.") — the conflict case is workflow-aware. Excellent pattern; recommend it become the universal banner (the 5 data-wall pages use a weaker custom banner).
- Login: precise error codes (INVALID_CREDENTIALS, ACCOUNT_LOCKED, SUSPENDED, RATE_LIMITED, NETWORK) with guidance.
- `ErrorBoundary` + `RoleError` per role.
- 409 conflict + 423 lock states exist in the mapping — evidence of optimistic-concurrency thinking at the UI layer.
- **Gap:** no undo observed anywhere (a rejected pass can be *reapplied* — good — but an accidental bulk-approve in `PermissionList` has no undo path visible; only `ConfirmDialog` pre-confirmation). **UX-018.**

## 29. Product Opportunities (ranked by value × feasibility)

1. **Actionable OIE handoff & the 4 sibling task surfaces** — render records + bulk forward (Required: workflow currently broken at its named step).
2. **Standard approver queue** — one `QueueCore` (search + filter + bulk + SLA pills + receipts) behind all three current implementations (Required for consistency; enables bulk for principal/HOD).
3. **Role-home "what needs me now" strip** — replace/precede retention stacks with a single prioritized action row per role (Useful; high reach).
4. **Drillable KPIs everywhere** — `KpiCard`/`KpiTile` with `onInspect` (principal already does this; extend the pattern) (Useful).
5. **Real-time channel via `/api/ws`** for gate walls, alerts, and queue movement — justified *only* for supervisor/operator/sync-critical approvers; keep polling for the rest (Opportunity; don't rebuild everything).
6. **Allocation request flow** — read-only room data for hostel_manager + "request reallocation" action to admin (Required: current job is impossible in-role).
7. **Undo for bulk approvals** (Opportunity; high-risk action).
8. **Freshness indicators on all 30s-polling surfaces** (Useful, cheap).
9. **Conduct/dispute cross-links on rejected tickets** (Opportunity).
10. **Saved queue views for approvers** (Opportunity — only justified if warden routinely re-filters the same way; Needs product clarification).

## 30. Required Improvements (broken workflows)

- **UX-001** Actionable task surfaces for oie-handoff + staff/requests + staff/history + caretaker/workers + housekeeping-tasks (records + action). P0 for exam-branch (exam day); P1 for the rest.
- **UX-003** Wire the student inspector "View details" CTA to open `PermissionDetailPanel` (the panel, ticket state, and Reapply flow all already exist — one missing call). P0 (core student workflow dead end).
- **UX-004** Either wire `selectedTicket` (e.g., clicking a pass in `PassHub`/`MyDocuments` sets it) or remove the inert "Focus a document" toggle + `SelfActionLoop`. P1.
- **UX-005** Fix `/hostel-manager/allocation`: remove the dead drag grid or provide a scoped rooms API; add an explicit "request via admin" path. P1.

## 31. Recommended Improvements (friction removal)

- **UX-008** Standardize the approver queue (consistency + bulk parity). P1.
- **UX-006** Make all KPI tiles drillable (reuse Principal's `linkHref` pattern). P2.
- **UX-009** Prune `ContextSituationBar` where it restates header + hero CTA (esp. visitor, staff, exam-branch pages). P2.
- **UX-010** Single `NotificationBell` mount in `RoleResponsiveShell` (CSS-hide instead of dual-mount). P2.
- **UX-011** Reorder/trim home retention stacks per role; put the role's #1 job first (guardian ward status; warden priority queue; operator desk entry). P1–P2.
- **UX-012** `DataFreshness` on all polling surfaces. P2.
- **UX-013** `/forbidden` copy: role-neutral; unauthenticated → `/login`. P3.
- **UX-015** Explain inert bell for unsupported roles. P3.

## 32. Advanced Opportunities

- **UX-017** WebSocket-driven gate wall + alert push (limited blast radius: supervisor/operator/sysadmin). P2.
- **UX-018** Undo window for bulk approvals (5s reversible batch). P3.
- **UX-019** Escalation SLA countdowns on all queues (exists in `ApproverDecisionQueue` via `SlaCountdownPill`; extend to `ApprovalsView`/`KanbanBoard`). P2.

## 33. UX Finding Register

| ID | Title | Classification | Roles | Severity | Priority | Confidence |
|----|-------|----------------|-------|----------|----------|------------|
| UX-001 | 5 counter-only "data-wall" task pages (oie-handoff etc.) | WORKFLOW GAP / FAKE COMPLETENESS | Exam Branch, OIE, Staff, Caretaker, Hostel Mgr | High | P0 (exam) / P1 | High |
| UX-002 | Visitor sidebar profile link | **RETIRED** (hasProfile:false verified) | Visitor | — | — | High |
| UX-003 | Student inspector "View details" no-op | BUG / INTERACTION GAP | Student | High | P0 | High |
| UX-004 | Student pass "Focus a document" inert state | BUG / INTERACTION GAP | Student | Medium | P1 | High |
| UX-005 | Hostel allocation: dead drag grid, no data source | WORKFLOW GAP | Hostel Manager | High | P1 | High |
| UX-006 | KPI tiles: drillable on Principal, inert elsewhere | INTERACTION GAP / CONSISTENCY | OIE, EMO, HOD, Supervisor | Medium | P2 | High |
| UX-007 | Student nav day-scholar leak | **RETIRED** (isHosteller gating verified) | Student | — | — | High |
| UX-008 | Three divergent approval queue implementations | CONSISTENCY / WORKFLOW GAP | All approvers | Medium | P1 | High |
| UX-009 | ContextSituationBar restates header+hero on 358 pages | COGNITIVE LOAD / POLISH | All | Low–Med | P2 | High |
| UX-010 | Dual NotificationBell mount + duplicate polling | PERFORMANCE UX / CONSISTENCY | All RoleResponsiveShell roles | Medium | P2 | High |
| UX-011 | 16 home pages stack 4–7 generic retention widgets | COGNITIVE LOAD / UX FAILURE | Guardian, Supervisor, HOD, VP, OIE, Staff, Exam*, Admin, SysAdmin | High | P1 | High |
| UX-012 | No freshness indicator on ~95 polling surfaces | INFORMATION GAP | All live surfaces | Medium | P2 | High |
| UX-013 | /forbidden copy "administrative role" + student fallback | POLISH | All | Low | P3 | High |
| UX-014 | DataTable lacks sort/pagination/search primitives | CONSISTENCY | All table consumers | Medium | P2 | High |
| UX-015 | Inert notification bell, no explanation, for 12 roles | DISCOVERABILITY | Guardian, Warden, Hostel Mgr, Caretaker, EMO, OIE, Exam*, Mess, Visitor, Worker | Low | P3 | High |
| UX-016 | Invalid `w128 h128 w112 h112` classes on /login | POLISH | Anonymous | Low | P3 | High |
| UX-017 | WebSocket endpoint unused; all-polling realtime | PRODUCT OPPORTUNITY | Supervisor, Operator, SysAdmin | — | P2 | High |
| UX-018 | No undo for bulk approval actions | PRODUCT OPPORTUNITY | All approvers | — | P3 | Medium |
| UX-019 | SLA countdowns not on all queues | PRODUCT OPPORTUNITY | Approvers | — | P2 | Medium |
| POL-1 | 4 pages with duplicate `"use client";` | POLISH | — | Low | P3 | High |
| POL-2 | Dead shell components (RoleDesktopShell/RoleMobileShell/RoleConsole) unmounted | TECH DEBT | — | Low | P3 | High |

## 34. Priority Matrix

- **P0 (core workflow broken):** UX-001 (exam-branch instance), UX-003.
- **P1 (major friction / consistency):** UX-001 (others), UX-004, UX-005, UX-008, UX-011.
- **P2 (meaningful improvement):** UX-006, UX-009, UX-010, UX-012, UX-014, UX-017, UX-019.
- **P3 (polish):** UX-013, UX-015, UX-016, UX-018, POL-1, POL-2.

## 35. Top 10 Highest-Impact Improvements

1. **UX-003 — Fix the student inspector "View details" CTA.**
   Problem: the student's request-tracking workflow dead-ends at the inspector; user can't open the full ticket from where they just looked at it. Affected: every student tracking a request. Why it matters: the request → approval → pass lifecycle is the product's spine. Expected outcome: one-line wiring (the `PermissionDetailPanel`, ticket state, and Reapply flow already exist on the same page).

2. **UX-001 — Give the 5 counter-only task pages their records and actions.**
   Problem: exam-branch OIE handoff (and staff/caretaker/hostel task pages) show "N pending" but neither the tickets nor the forward/resolve action. Affected: exam-day operations, staff leave ops. Why it matters: the named workflow step cannot be performed on its named page. Expected outcome: handoff bundles actually forward; queues become task surfaces.

3. **UX-011 — Put the role's #1 job at the top of every home page.**
   Problem: 16 home pages bury the operational queue under 4–7 engagement widgets; a guardian's "is my child safe" or a warden's "what's overdue" is below the fold. Affected: every operational role. Why it matters: time-to-first-action and reassurance are the products of these roles. Expected outcome: single prioritized strip first; retention widgets demoted or removed for transient roles (visitor/operator already leaner).

4. **UX-005 — Make hostel allocation an honest, completable job.**
   Problem: the role's signature task shows a drag grid that is structurally empty (no rooms API) beside a card that says "admin does this." Affected: hostel managers. Why it matters: a permanently unfillable affordance destroys trust in the console. Expected outcome: either scoped room data + request flow, or an explicit request-to-admin action.

5. **UX-008 — One approver queue component for all approvers.**
   Problem: same job, three implementations, bulk actions available only in two of the *other* roles' tools while principal/HOD lack them. Affected: all approvers. Why it matters: decision throughput on SLA-breach days and cognitive cost of switching consoles. Expected outcome: a `QueueCore` with search/filter/bulk/SLA receipts; role-scoped actions only.

6. **UX-006 — Make every KPI tile drillable.**
   Problem: four of five KpiTile implementations are inert divs; only Principal's tiles open inspectors. Affected: OIE/EMO/HOD/Supervisor. Why it matters: "I see a red number, now what?" is the core monitoring question. Expected outcome: reuse the `linkHref`/`onInspect` pattern; number → record.

7. **UX-004 — Fix or remove the inert "Focus a document" pivot on /student/passes.**
   Problem: the button toggles a state nothing sets; the SelfActionLoop can never appear. Affected: students managing pass documents. Why it matters: fake interactivity on the pass page undermines the strongest part of the student flow. Expected outcome: wire pass-row clicks to set the focused ticket (or drop the toggle).

8. **UX-010 — Mount the notification bell once.**
   Problem: `RoleResponsiveShell` renders two bells (mobile header + desktop fixed), each polling independently; same for `RoleChrome` instances. Affected: all 15 responsive-shell consoles. Why it matters: double network load, double state, duplicate badge counters. Expected outcome: single mount, CSS visibility per breakpoint.

9. **UX-012 — Show data freshness on every live surface.**
   Problem: ~95 call sites poll at 15–60s with no "last updated" anywhere but 3 pages. Affected: operational monitoring users. Why it matters: a stale occupancy or queue number during an incident misleads. Expected outcome: `DataFreshness`/`LiveFreshnessBar` standard on polling widgets.

10. **UX-009 — Prune redundant ContextSituationBars.**
    Problem: on 358 pages the bar restates the page header and hero CTA; on visitor/staff/exam pages it adds a third copy of the same CTAs. Affected: all roles, every page load. Why it matters: vertical space on mobile is the scarcest resource for the users who need it most. Expected outcome: bar reserved for pages where live status actually changes the next action.

## 36. Minimal vs Advanced Improvements

| Problem | Minimal improvement | Advanced improvement |
|---|---|---|
| UX-001 counter pages | Render the fetched list + one bulk action button on each | Per-item verify/reject, handoff receipt, follow-up link to OIE queue |
| UX-003 dead CTA | Call the existing `setActiveTicket`/panel-open handler from the button | Inspector→detail with preserved scroll & focus |
| UX-004 inert pivot | Remove the toggle; keep the docs link | Pass-row click focuses the SelfActionLoop |
| UX-005 allocation | Replace dead grid with "request via admin" action | Scoped read-only rooms API + request-approve flow |
| UX-008 queues | Add bulk approve/reject to `ApprovalsView` (component already supports it upstream in PermissionList) | Shared `QueueCore` across all roles |
| UX-011 home stacks | Reorder: priority strip first, retention widgets second | Per-role widget config from `src/config/roles` home arrays (already exists as `home: HomeWidget[]`) |
| UX-010 double bell | Render one bell, `hidden lg:block` / `lg:hidden` on chrome only | Single global bell service with shared store |
| UX-012 freshness | `DataFreshness` chip on polling pages | One freshness context per console (15s admin overview already aggregates) |
| UX-017 realtime | Keep polling; add a "last seen" indicator | WS subscription for gate wall + critical alerts only |
| UX-018 undo | Confirm dialog with explicit consequences (exists) | 5s undo window for bulk batches |

## 37. Role-Specific Recommendations

- **Student:** fix UX-003/UX-004 (P0/P1); consider trimming the student home's 6 groups to 4 by merging Campus + Attendance.
- **Guardian:** strip retention widgets; lead with "Ward on campus · last scan 08:45" + consent inbox (UX-011 instance).
- **Gate Operator:** no changes to kiosk (strong); ensure `/operator` home desk-entry card stays above fold.
- **Supervisor:** move `FocusZone`/priority items above retention stack; add SLA pills (UX-019).
- **HOD / VP / Principal:** queue standardization (UX-008); drillable KPIs (UX-006); keep Principal's deep-link strength.
- **Hostel Manager:** allocation fix (UX-005); complaints console is fine.
- **Mess In-Charge:** keep `/mess/scan`; trim home stack (UX-011).
- **OIE / Exam Branch / Superintendent:** UX-001 (required for exam day); drillable tiles.
- **Visitor:** already lean; remove duplicate CTA grid (UX-009 instance).
- **Admin / SysAdmin:** strong; apply freshness (UX-012), prune home retention stack, keep two-phase import as the model for dangerous bulk ops.

## 38. Cross-Product Recommendations

1. One responsive shell (done for 15 layouts) — complete migration for the remaining bespoke shells (Principal, HOD, VP, OIE, exam-branch, exam/superintendent, guardian, operator, admin, sysadmin) or accept the variance deliberately.
2. One queue component (UX-008) + one KPI-tile component with `onInspect` default-on (UX-006).
3. "Data wall" template retired: any page that fetches records must render records or state explicitly why it can't (UX-001, UX-005).
4. Retention widgets become opt-in per role via the existing `home: HomeWidget[]` config, not hard-coded per page.
5. Freshness + SLA indicators as first-class shared chips.
6. Real-time only where stakes justify (gate wall, alerts) — don't convert everything to WS.

## 39. Unresolved Questions

1. **Mess & Dining for day scholars:** the student nav gates hostel pass items on `isHosteller` but not the 5 Mess links — intentional (everyone eats in the mess) or an oversight?
2. **OIE handoff ownership:** is the *action* meant to live on the exam-branch page or is `/exam-branch` (Pass Queue) the canonical forward surface, making oie-handoff purely informational?
3. **Hostel allocation model:** direct manager drag-assign (needs a rooms API) vs request-to-admin (current honest fallback) — which is the intended operating model?
4. **Bell coverage:** 12 roles have an intentionally inert notification bell — should they get one, or an explicit "no notifications for your role" state?
5. **Retention widget mandate:** are TaskContinuity/UnifiedCampusCalendar institutional requirements for all roles, or growth experiments that can be removed from operational consoles?
6. **WS investment:** is `/api/ws` maintained/used elsewhere (bot, mobile), justifying UI adoption, or dead infrastructure?
7. **Bulk approval risk policy:** institutionally, is undo-after-bulk-approve acceptable (some decisions may need immediate gate enforcement)?

## 40. Assumptions & Confidence

- All findings derive from static source inspection on 2026-11-24; no running-app observation. UI-rendering claims (what a user *sees*) are **Confidence: Medium — requires human validation**; code-structure claims (what the code *does*) are **High**.
- Assumes the repo is the deployed source of truth; the deployed container may lag this tree.
- Assumes `hasProfile`/`when(ctx)` gates behave as documented (fail-closed security / fail-open UX) — not independently exercised.
- RETIRED findings (UX-002, UX-007, double-mount, min-h11, use-client-after-import) were verified absent on disk; if the user's environment predates those fixes, they may still be live there.

## 41. Final Product UX Assessment

**Maturity: Level 3 (workflow application) with Level-4 pockets.**
The approval machine, SLA/escalation machinery, two-phase bulk import, and the gate kiosk are genuine workflow/decision-support products. What holds the whole back to "Level 3 with friction":

- Two dead ends on the student's spine workflow (UX-003, UX-004) — small fixes, large trust impact.
- A template-generation pattern that produced five "dashboard-shaped" task pages with no task (UX-001) and a promise it can't keep (UX-005).
- Consistency debt: the same decision job served by three queue implementations and five KPI-tile implementations, so the user re-learns the console per role.
- Attention economy: generic retention stacks and triple-stated page context tax the very users (wardens, operators, guardians) who need the clearest signal.

**Answer to the final question:** a gate operator, a student tracking a pass, or a warden in the SLA-breach queue can largely do their job — with two specific dead ends (student inspector CTA; exam-branch handoff) and one inverted-priority problem (homes bury the queue). The product is a coherent system *by data and config*; it behaves like several products *by surface*. The top 10 above closes the broken links first, then makes the surviving surfaces consistent.
