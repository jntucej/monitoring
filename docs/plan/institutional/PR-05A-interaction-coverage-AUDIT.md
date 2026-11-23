# PR-05A — Principal Interaction Coverage Audit

> Scope: every record surface under `src/app/(approver)/principal/**`
> (`page.tsx` files **and** `_shared/*View.tsx` components) plus the KPI
> cards on the principal home (`_retention/*`, local `KpiTile`, shared
> `KpiCard`, `WeekBar`). Verdict vocabulary:
>
> - **dead** — record is shown but click does nothing meaningful
> - **navigate-only** — click just changes route; no context exposed
> - **inspect** — click opens the standardized `EntityInspector` drawer
> - **decide** — record surface carries an in-place decision action
>
> Inspection infrastructure: `src/components/shared/EntityInspector.tsx`,
> `useEntityInspector.tsx`, `HoverPreview.tsx`; design contract in
> `docs/design/entity-inspection-system.md`.
>
> Authoritative wiring today (already inspected):
> `/principal/escalations`, `/principal/attention`, `/principal/decisions`,
> `/principal/cases`. Every other record surface on the principal console
> is **not** wired and is inventoried below.
>
> All citations are `file:line` against the live tree at audit time.
> No code changes were made by this audit.

---

## 1. Routes & record surfaces — full matrix

### 1.1 Route inventory (every `page.tsx` under principal)

| Route | File | Renders |
|---|---|---|
| `/principal` | `src/app/(approver)/principal/page.tsx:6` | `<ApprovalsView status="PENDING">` (alias of `/principal/approvals`) |
| `/principal/home` | `src/app/(approver)/principal/home/page.tsx:103` | Principal console (KPI tiles + retention widgets) |
| `/principal/approvals` | `.../approvals/page.tsx:6` | `<ApprovalsView status="PENDING">` |
| `/principal/approvals/pending` | `.../approvals/pending/page.tsx:4` | `redirect("/principal/approvals")` |
| `/principal/approvals/delegated` | `.../approvals/delegated/page.tsx:6` | `<ApprovalsView status="DELEGATED">` |
| `/principal/approvals/escalated` | `.../approvals/escalated/page.tsx:6` | `<ApprovalsView status="ESCALATED">` |
| `/principal/approvals/overdue` | `.../approvals/overdue/page.tsx:6` | `<ApprovalsView status="OVERDUE">` |
| `/principal/attention` | `.../attention/page.tsx:154` | EntityInspector wired |
| `/principal/cases` | `.../cases/page.tsx:240` | EntityInspector wired |
| `/principal/decisions` | `.../decisions/page.tsx:122` | EntityInspector wired |
| `/principal/emergency` | `.../emergency/page.tsx:29` | command list, no inspector |
| `/principal/escalations` | `.../escalations/page.tsx:122` | EntityInspector wired |
| `/principal/examinations` | `.../examinations/page.tsx:6` | `<ExamsView />` |
| `/principal/governance` | `.../governance/page.tsx:4` | `redirect("/principal/governance/audit")` |
| `/principal/governance/analytics` | `.../governance/analytics/page.tsx:6` | `<AnalyticsView />` |
| `/principal/governance/audit` | `.../governance/audit/page.tsx:8` | audit ledger, no inspector |
| `/principal/governance/delegations` | `.../governance/delegations/page.tsx:6` | `<DelegationsView />` |
| `/principal/governance/reports` | `.../governance/reports/page.tsx:6` | `<ReportsView />` |
| `/principal/operations` | `.../operations/page.tsx:4` | `redirect("/principal/operations/gates")` |
| `/principal/operations/gates` | `.../operations/gates/page.tsx:6` | `<GatesView />` |
| `/principal/operations/hostel` | `.../operations/hostel/page.tsx:6` | `<HostelView />` |
| `/principal/operations/incidents` | `.../operations/incidents/page.tsx:6` | `<IncidentsView />` |
| `/principal/passes` | `.../passes/page.tsx:19` | pass generator + recent table |
| `/principal/people` | `.../people/page.tsx:4` | `redirect("/principal/people/departments")` |
| `/principal/people/attendance` | `.../people/attendance/page.tsx:6` | `<ExceptionsView />` |
| `/principal/people/departments` | `.../people/departments/page.tsx:6` | `<DepartmentsView />` |
| `/principal/profile` | `.../profile/page.tsx:5` | inline local card (the `_shared/ProfileView` is **not** rendered by any principal page today — see §3 P3) |

### 1.2 Matrix — every record surface

Legend for "Inspector?": **Wired** = page renders `EntityInspector`
with a `EntityInspection` model built for that record; **DetailSheet** =
local `PermissionDetailPanel` inside a fixed sheet (same intent, not the
shared inspector); **No** = no inspector / no detail drawer.

| # | Route / View | Record | Click behavior today | Inspector wired? | Context / history exposed | Legitimate actions | Verdict |
|---|---|---|---|---|---|---|---|
| 01 | `/principal` · `ApprovalsView` (`.../_shared/ApprovalsView.tsx:82`, `:106`) | Pending/escalated/overdue/delegated ticket row | Mobile card or desktop `DataTable` row → `onRowClick` opens local `DetailSheet` (`:127`) | DetailSheet (local, not shared) | Stage history, student profile, verification status, document, digital sign (all via `PermissionDetailPanel`) | Approve / Reject / Forward / Escalate / CoSign / DirectGenerate | **decide** (works but uses local sheet, not `EntityInspector`; design doc §45-95 treats local sheet as the legacy pattern) |
| 02 | `/principal/approvals` · `ApprovalsView` | Same | Same | Same | Same | Same | **decide** |
| 03 | `/principal/approvals/delegated` | Same | Same | Same | Same | Same | **decide** |
| 04 | `/principal/approvals/escalated` | Same | Same | Same | Same | Same | **decide** |
| 05 | `/principal/approvals/overdue` | Same | Same | Same | Same | Same | **decide** |
| 06 | `/principal` · `WeekBar` (`.../_shared/WeekBar.tsx:11`) | Session decision counter + streak badge | No handler; text-only; `StreakBadge` is also a read-only span (`_retention/StreakBadge.tsx:11`) | No | none | none | **dead** (informational, not a record) |
| 07 | `/principal` · `DecisionHistoryPanel` (lazy `.../_shared/ApprovalsView.tsx:138`) | This approver's own monthly decisions | Not clicked; panel is read-only summary | No | none | none | **dead** (informational) |
| 08 | `/principal/home` · `KpiTile` "Pending approvals" (`home/page.tsx:159`) | KPI tile | Click → `/principal/attention` (via `<a>` at `:89`); hover → `HoverPreview MetricPreview` (`:85-96`) | No | none (hover only) | navigate | **navigate-only** |
| 09 | `/principal/home` · `KpiTile` "Overdue" (`home/page.tsx:165`) | KPI tile | Click → `/principal/attention`; hover preview | No | none | navigate | **navigate-only** |
| 10 | `/principal/home` · `KpiTile` "Emergencies" (`home/page.tsx:172`) | KPI tile | Click → `/principal/emergency` | No | none | navigate | **navigate-only** |
| 11 | `/principal/home` · `KpiTile` "Delegations active" (`home/page.tsx:179`) | KPI tile | Click → `/principal/governance/delegations` | No | none | navigate | **navigate-only** |
| 12 | `/principal/home` · `EmergencyPulse` item (`_retention/EmergencyPulse.tsx:25`) | Active emergency ticket | `<Link href={/principal/approvals?ticket=...}>` → lands on PENDING view; `ApprovalsView` reads `?ticket=` param and opens the `DetailSheet` for that ticket | No | none pre-navigation | navigate | **navigate-only** |
| 13 | `/principal/home` · `FocusZone` (`_retention/FocusZone.tsx:72`) | Top priority ticket | "Open in focus mode" button → global `FocusMode` overlay (keyboard-driven decide: `Space`/`X`/`E`); "View details" `<Link>` → `item.href` (which is `principal/approvals?ticket=...`) | No | none pre-navigation | **decide** (inside FocusMode) or navigate | **decide** (with caveats: the "View details" path lands in ApprovalsView, not in the shared inspector) |
| 14 | `/principal/home` · `ChainImpact` (`_retention/ChainImpact.tsx:27`) | Aggregated "blocked on you" counter | No handler; static text + two numeric tiles | No | none | none | **dead** |
| 15 | `/principal/home` · `DelegationHealth` "Manage" link (`_retention/DelegationHealth.tsx:25`) | delegation counters | `<Link href="/principal/governance/delegations">` | No | none | navigate | **navigate-only** |
| 16 | `/principal/home` · `MorningBrief` progress bar | session counter | read-only | No | none | none | **dead** (informational) |
| 17 | `/principal/home` · `StrategicScorecard` 4 `Stat` blocks (`_retention/StrategicScorecard.tsx:38-69`) | weekly stats + personal bests | no handler | No | none | none | **dead** |
| 18 | `/principal/home` · `WinFeed` item (`_retention/WinFeed.tsx:80`) | Past cleared ticket | no handler on `motion.li` | No | none | none | **dead** — should link back to `/principal/approvals?ticket=...` or open the shared inspector |
| 19 | `/principal/home` · `InsightCard` (`_retention/InsightCard.tsx:32`) | copy only | no handler | No | none | none | **dead** (intentionally static) |
| 20 | `/principal/home` · `UpcomingPreview` item (`_retention/UpcomingPreview.tsx:41`) | SLA-imminent ticket | `<Link href={/principal/approvals?ticket=...}>` | No | none | navigate | **navigate-only** |
| 21 | `/principal/home` · `VpInboundCard` item (`src/components/principal/VpInboundCard.tsx:80`) | VP flag | "Acknowledge" / "Resolve" buttons → POST `/api/principal/inbound/[id]/respond` | No | none | **decide** | **decide** |
| 22 | `/principal/home` · `CelebrateOverlay` | celebration | `pointer-events-none` overlay; auto-dismiss | No | none | none | **dead** (intentional) |
| 23 | `/principal/home` · `LiveClassCard` (campus-wide) | live class | no handler on tile | No | none | navigate if wired (today not) | **dead** |
| 24 | `/principal/home` · `QuickActions` (`src/components/principal/shared/PrincipalQuickActions`) | shortcut list | navigates via inner links | No | none | navigate | **navigate-only** |
| 25 | `/principal/home` · `NotificationCenter` (`src/components/principal/shared/PrincipalNotificationCenter`) | notification item | navigates / marks read | No | none | navigate / decide (mark read) | **navigate-only / decide** (depends on item type — no per-record inspection) |
| 26 | `/principal/home` · shell bell (`_shell/PrincipalNotificationBell.tsx`) | bell | delegates to shared `NotificationBell` | No | none | navigate | **navigate-only** |
| 27 | `/principal/people/departments` · `DepartmentsView` row (`.../_shared/DepartmentsView.tsx:94-109`) | department (code, name, HOD, faculty, students, ratio, attendance%) | `DataTable` rendered without `onRowClick` (line 94-109); mobile card `<li>` has no handler either (`:68-90`) | No | none | none | **dead** — `KpiCard` header tiles (`:51-58`) are also dead |
| 28 | `/principal/people/attendance` · `ExceptionsView` row (`.../_shared/ExceptionsView.tsx:78`, `:95`, `:112`) | Absent / Late / Flagged person | `<li>` elements, no handler, no `KpiCard`-drilled link | No | none | none | **dead** — KPI tiles "Absent / Late / Flagged" (`:60-62`) are also dead |
| 29 | `/principal/operations/gates` · `GatesView` row (`.../_shared/GatesView.tsx:75-91`) | gate (name, code, location, status) | `DataTable` without `onRowClick`; mobile card no handler (`:57-72`) | No | none | none | **dead** — KPI tiles (`:42-48`) also dead |
| 30 | `/principal/operations/hostel` · `HostelView` row (`.../_shared/HostelView.tsx:80-105`) | hostel block (name, capacity, occupied, status) | `DataTable` without `onRowClick`; mobile card no handler (`:61-77`) | No | none | none | **dead** — KPI tiles (`:45-52`) also dead |
| 31 | `/principal/operations/incidents` · `IncidentsView` row (`.../_shared/IncidentsView.tsx:80-101`) | active alert | `DataTable` without `onRowClick`; mobile card no handler (`:61-77`) | No | none | none | **dead** — KPI tiles (`:45-51`) also dead |
| 32 | `/principal/examinations` · `ExamsView` row (`.../_shared/ExamsView.tsx:78-103`) | exam access-exception (candidate, ticket, reason, status) | `DataTable` without `onRowClick`; mobile card no handler (`:61-75`) | No | none | none | **dead** — KPI tiles (`:45-51`) also dead |
| 33 | `/principal/governance/delegations` · `DelegationsView` row (`.../_shared/DelegationsView.tsx:79-105`) | delegation rule | `DataTable` without `onRowClick`; mobile card no handler (`:62-77`) | No | none | none | **dead** — KPI tiles (`:47-53`) also dead; `data.data.auditTrail` returned by `/api/principal/delegations` (`src/app/api/principal/delegations/route.ts:94`) is unused in the view |
| 34 | `/principal/governance/audit` · audit row (`governance/audit/page.tsx:20-28`) | audit event (decision_no, operation, actor, authority) | `<article>` with no handler, no inspector, no detail page | No | none | none | **dead** |
| 35 | `/principal/governance/reports` · `ReportsView` row (`.../_shared/ReportsView.tsx:67-82`) | per-workflow-type weekly volume | `DataTable` without `onRowClick`; mobile card no handler (`:51-64`) | No | none | none | **dead** — KPI tiles (`:40-42`) also dead |
| 36 | `/principal/governance/analytics` · `AnalyticsView` cell (`.../_shared/AnalyticsView.tsx:83-108`) | SLA heatmap cell (stage) | `DataTable` without `onRowClick`; mobile card no handler (`:59-80`) | No | none | none | **dead** — KPI tiles (`:47-50`) also dead |
| 37 | `/principal/emergency` · command row (`emergency/page.tsx:38-50`) | emergency command (state, reason, actor_role, scopes) | `<article>` no handler; current-state banner (`:29`) also no handler | No | none | none | **dead** |
| 38 | `/principal/passes` · "Recently generated" table row (`passes/page.tsx:170-178`) | generated pass ticket | `<tr>` no handler | No | none | none | **dead** — generator form (`:101-152`) is the only decision surface on this page |
| 39 | `/principal/profile` · inline profile card (`profile/page.tsx:10-14`) | caller's own profile | no handler; data from `useAuthStore` | No | none | none | **dead** (intentional read-only) |
| 40 | Any view · shared `KpiCard` (`src/components/shared/KpiCard.tsx:11-36`) | generic KPI tile | plain `<div>`, no handler; used 11+ times across principal views with `label`/`value` only | No | none | none | **dead** — design doc §10-13 says KPI tiles should hover-preview + click to detail; none of the `KpiCard` instances in `_shared/*View.tsx` use `HoverPreview` or `linkHref` |
| 41 | Any view · shared `MiniStat` (`src/components/shared/MiniStat`) | mini stat | no handler | No | none | none | **dead** (informational) |
| 42 | `/principal` · shell sidebar + notification bell (`_shell/PrincipalSidebar.tsx`, `PrincipalNotificationBell.tsx`) | navigation + notification | navigation / mark-read | No | none | navigate | **navigate-only** |
| 43 | `/principal` · shell status bar (`_shell/PrincipalDesktopShell.tsx`, `PrincipalMobileShell.tsx`) | role chrome | navigation | No | none | navigate | **navigate-only** |
| 44 | `/principal` · shell command bar (`src/components/approver/PrincipalCommandBar.tsx`) | role command palette | navigation / shortcut | No | none | navigate | **navigate-only** |

### 1.3 Inspector-wired pages (verify + diff vs. design doc §46-61)

| Page | File:line | Entity | Notes |
|---|---|---|---|
| `/principal/attention` | `src/app/(approver)/principal/attention/page.tsx:154` | Attention item | Full sections: what / source / suggested / timeline / actions. Actions jump to `/principal/decisions` and `/principal/escalations`. |
| `/principal/escalations` | `src/app/(approver)/principal/escalations/page.tsx:122` | Escalation | Full sections: why / target / timeline / actions. |
| `/principal/decisions` | `src/app/(approver)/principal/decisions/page.tsx:122` | Decision | Full sections: provenance / reason / timeline / actions (audit + escalations). |
| `/principal/cases` | `src/app/(approver)/principal/cases/page.tsx:240` | Case | Full sections: overview / risk & authority / timeline / payload / actions; role-filtered via `useRoleContext` (`cases/page.tsx:159-180`). |

All four follow the `EntityInspection` contract in
`docs/design/entity-inspection-system.md:24-45`. The design doc §92-96
lists "Hostel / shift / incident entities" as backlog; this audit confirms
they remain unwired.

---

## 2. Backend data availability (API routes)

Each fix below cites the API endpoint that supplies the data needed to
build the `EntityInspection` model. All routes live under
`src/app/api/**` and were verified to exist.

| Entity | List / summary route | Detail / related route | Mutation route | File:line refs |
|---|---|---|---|---|
| Permission ticket | `GET /api/permissions?stage=principal&status=...` (`src/app/api/permissions/route.ts:471`) | `GET /api/permissions/[ticket]` (`route.ts:354`), sub-routes `/amend` `/escalate` `/forward` `/revoke` `/sign` `/track` under `src/app/api/permissions/[ticket]/` | `PATCH /api/permissions/[ticket]` (`route.ts:355`) | — |
| Department | `GET /api/vp/academics` (`src/app/api/vp/academics/route.ts:263`, principal-allowed) | `GET /api/departments` (`src/app/api/departments/route.ts:182`); `GET /api/departments/[dept]/classes` (`:56`) | `POST/PATCH /api/departments` (`:176`, `:178`, admin/sysadmin) | — |
| Hostel block | `GET /api/hostel/blocks` (`src/app/api/hostel/blocks/route.ts:43`; principal allowed; returns `{block, total, occupied}` per block) | `GET /api/hostel-manager/summary` (`route.ts:88`); `GET /api/hostel/returns-timeline` (`route.ts:92`) | none exposed to principal today | — |
| Gate | `GET /api/gates` (`src/app/api/gates/route.ts:114`; principal NOT in allowed role list — `operator/supervisor/admin/sysadmin` only; today's `GatesView` therefore relies on the `withAuthorization` fallback; confirm role gate before exposing) | `GET/PATCH/DELETE /api/gates/[id]` (`route.ts:57`, `:59`); schedule routes under `gates/schedule/` | `POST /api/gates` (`:119`), admin/sysadmin only | — |
| Alert / incident | `GET /api/alerts?resolved=&severity=` (`src/app/api/alerts/route.ts:86`; principal in `requiredRole`) | `PATCH /api/alerts/[id]` (`route.ts:51`) — resolve | `POST /api/alerts/assign` (separate route) | — |
| Exam access-exception | `GET /api/exam/access-exceptions` (`route.ts:146`; principal in `requiredRole`) | — | `POST` `:153`, `PATCH` `:155` (mark resolved) | — |
| Delegation | `GET /api/principal/delegations?status=` (`route.ts:197`); `POST` `:202` | audit trail embedded in response (`route.ts:94`) | `POST /api/principal/delegations` creates a new rule | — |
| Audit log | `GET /api/principal/audit` (`route.ts:35`; principal/sysadmin) | `GET /api/admin/audit-logs` (admin) | — | — |
| Decision ledger | `GET /api/principal/decisions?limit=` (`src/app/api/principal/decisions/route.ts`) | — | decisions are written by the workflow, not by a principal POST | — |
| Escalation | `GET /api/principal/escalations?open=true&limit=` | — | escalations are generated by policy | — |
| Attention | `GET /api/principal/attention?limit=50` | `GET /api/attention/queue`, `GET /api/attention/timeline` | — | — |
| Week digest (ReportsView) | `GET /api/principal/week-digest` (`route.ts:86`) | — | — | — |
| SLA heatmap (AnalyticsView) | `GET /api/principal/sla-heatmap` (`route.ts:68`) | `details[]` in payload (per-stage, per-workflow rows) | — | — |
| Profile | `GET /api/profile` (`route.ts:163`) | `PATCH /api/profile` (`route.ts:164`) | same | — |
| Emergency commands | `GET /api/principal/emergency` (`route.ts:27`) | — | state transitions are elsewhere (`/api/admin/lockdown`) | — |
| VP bridge (VpInboundCard) | `GET /api/principal/inbound` (`route.ts:54`) | — | `POST /api/principal/inbound/[id]/respond` | — |
| Cases | `GET /api/cases?limit=100` (`route.ts:118`) | `GET /api/cases/[id]` (`[id]/route.ts:115`), `POST /api/cases/[id]/events` | `POST /api/cases` | — |

**Gaps that block a full inspector fix without new backend work**

- `GET /api/gates` does not list `principal` in its role allow-list
  (`src/app/api/gates/route.ts:114-115`). Today `GatesView` may already be
  getting a 403 or the legacy `withAuthorization` fallback. Before adding
  a gate inspector, either add `principal` to the allow-list or route the
  view through `/api/admin/gates` (admin-only — worse).
- `GET /api/hostel/blocks` (`route.ts:43`) is read-only and returns
  aggregate occupancy only — no per-room or per-student payload. A
  "hostel block inspector" can show occupancy + returns timeline via
  `/api/hostel/returns-timeline`, but no per-student inspection until a
  per-block detail endpoint is added.
- `GET /api/exam/access-exceptions` returns one flat list — no
  per-exception detail endpoint; `PATCH` requires `{id}` in body.
  Inspector can show the row + stage_history already embedded by
  `permission_requests.stage_history`.
- `GET /api/principal/delegations` returns `delegations[]` +
  `auditTrail[]`; no per-delegation GET — inspector can still be built
  from the row + auditTrail slice.
- `GET /api/principal/audit` returns `audit_logs` rows; no per-event
  detail endpoint. Inspector can show the row + JSON details.
- `GET /api/vp/academics` returns departments + exceptions; no
  per-department detail endpoint. Inspector can show the department row +
  today's exception slice for that department (filter client-side from
  the same payload).
- `GET /api/principal/week-digest` returns per-workflow-type counts; no
  per-category drill-down. Inspector would need `?workflow_type=` filter
  on `/api/permissions`.
- `GET /api/principal/sla-heatmap` returns `cells[]` + `details[]`; the
  `details` array is the per-stage×workflow breakdown that can drive a
  cell inspector.

---

## 3. Prioritized fix list (P0 first)

P0 = user-visible record surface that is a **dead** click (record exists,
no behavior at all, no route, no hover preview, no action). P1 = surface
that is navigate-only but should expose the entity in-place. P2 = surface
that already works but is not on the shared inspection contract
(`EntityInspector`) — upgrade for consistency. P3 = informational tiles
that are dead by design; only wire hover preview if the metric is
decision-relevant.

### P0 — Dead interactions (highest user value, lowest effort)

These are record rows/cards that have no handler, no link, no inspector.
Fix = wire `useEntityInspector` + `EntityInspector` for the entity,
building `sections` from the existing row data and (where available)
the detail/related routes listed in §2.

1. **`/principal/people/departments` — Department row + 4 KPI tiles**
   - Dead: `.../_shared/DepartmentsView.tsx:94` (table), `:68` (mobile card), `:51-58` (KPI tiles)
   - Inspector sections: `Overview` (code, name, HOD, attendance%),
     `Faculty & students` (headcount, ratio), `Today's exceptions`
     (slice from same `/api/vp/academics` payload), `Actions` →
     `/principal/people/attendance` (drill into exceptions for that dept).
   - KPI tiles: wrap each in `HoverPreview` + `MetricPreview` with the
     underlying number, link to the view itself (or a filtered
     `/principal/people/departments?dept=<code>`).
2. **`/principal/people/attendance` — Absent / Late / Flagged person rows**
   - Dead: `.../_shared/ExceptionsView.tsx:78`, `:95`, `:112` + KPI tiles `:60-62`
   - Inspector sections: `Overview` (person, designation, department),
     `Movement today` (via `/api/persons/[id]/history` if available),
     `Actions` → link to their pending permissions (`/principal/approvals?student=<id>`).
3. **`/principal/operations/gates` — Gate row + 3 KPI tiles**
   - Dead: `.../_shared/GatesView.tsx:75` (table), `:57` (mobile card), `:42-48` (KPI tiles)
   - **Blocker**: `/api/gates` does not allow `principal` role
     (`src/app/api/gates/route.ts:114-115`). Fix backend first, then
     wire inspector: `Overview` (name, code, location, status),
     `Recent activity` (via `/api/gate/logs`), `Actions` →
     `/principal/operations/incidents?gate=<id>`.
4. **`/principal/operations/hostel` — Hostel block row + 4 KPI tiles**
   - Dead: `.../_shared/HostelView.tsx:80` (table), `:61` (mobile card), `:45-52` (KPI tiles)
   - Inspector sections: `Overview` (block, capacity, occupied),
     `Returns today` (via `/api/hostel/returns-timeline`),
     `Actions` → `/principal/people/attendance?dept=<block>`.
5. **`/principal/operations/incidents` — Alert row + 3 KPI tiles**
   - Dead: `.../_shared/IncidentsView.tsx:80` (table), `:61` (mobile card), `:45-51` (KPI tiles)
   - Inspector sections: `Overview` (title, severity, status),
     `Evidence` (via `GET /api/alerts` full row), `Timeline`,
     `Actions` → "Resolve" button wired to `PATCH /api/alerts/[id]`
     (`src/app/api/alerts/[id]/route.ts:51`) for principal (role already allowed).
6. **`/principal/examinations` — Exam exception row + 3 KPI tiles**
   - Dead: `.../_shared/ExamsView.tsx:78` (table), `:61` (mobile card), `:45-51` (KPI tiles)
   - Inspector sections: `Candidate` (name, roll, ticket), `Reason`,
     `Stage history` (from `permission_requests.stage_history`),
     `Actions` → "Mark resolved" wired to `PATCH /api/exam/access-exceptions`.
7. **`/principal/governance/delegations` — Delegation row + 3 KPI tiles**
   - Dead: `.../_shared/DelegationsView.tsx:79` (table), `:62` (mobile card), `:47-53` (KPI tiles)
   - Inspector sections: `Rule` (delegate role, scope, expiry),
     `Audit` (slice `auditTrail` from the same response),
     `Actions` → "Revoke" (needs a new `PATCH /api/principal/delegations/[id]` — not in today's API; mark as backend TODO).
8. **`/principal/governance/audit` — audit event card**
   - Dead: `governance/audit/page.tsx:20`
   - Inspector sections: `Event` (action, actor, role), `Payload`
     (JSON of `details`), `Timeline` (created), `Actions` →
     `/principal/decisions` (related decision if any).
9. **`/principal/governance/reports` — per-workflow row + 3 KPI tiles**
   - Dead: `.../_shared/ReportsView.tsx:67` (table), `:51` (mobile card), `:40-42` (KPI tiles)
   - Inspector sections: `Category` (workflow_type, count),
     `Drill-down` → `/principal/approvals?workflow_type=<x>` (needs
     new query param on the permissions route — backend TODO; today
     only `status`/`overdue`/`delegated_to` are parsed at
     `ApprovalsView.tsx:46-51`).
10. **`/principal/governance/analytics` — SLA heatmap cell + 4 KPI tiles**
    - Dead: `.../_shared/AnalyticsView.tsx:83` (table), `:59` (mobile card), `:47-50` (KPI tiles)
    - Inspector sections: `Stage` (stage, total, withinSla, breached,
      rate), `By workflow` (slice from `details[]`), `Actions` →
      `/principal/approvals/overdue` (where the breaches live).
11. **`/principal/emergency` — current-state banner + command card**
    - Dead: `emergency/page.tsx:29` (banner), `:38` (card)
    - Inspector sections: `State` (state, count of commands), `Commands`
      (list of recent commands from same response), `Actions` →
      `/principal/decisions` (audit trail of the command).
12. **`/principal/passes` — "Recently generated" table row**
    - Dead: `passes/page.tsx:170-178`
    - Inspector sections: `Pass` (ticket, student, from/to, reason),
      `QR` (link to `/api/permissions/[ticket]/qr`), `Actions` →
      open in `/principal/approvals?ticket=<x>` (for history view).
13. **`/principal/home` — WinFeed item**
    - Dead: `_retention/WinFeed.tsx:80`
    - Fix: make each `<motion.li>` a `<Link href={/principal/approvals?ticket=<w.ticket>}>` or a button that opens the shared inspector with `kind: "decision"` + a "Re-open" action. Today `?ticket=` deep-link only works on `/principal/approvals` PENDING view — for a previously decided ticket, the row won't be in PENDING; extend the ticket lookup to include the decided view.

### P1 — Navigate-only → in-place inspect

These surfaces do work but only navigate. Upgrade to also expose a
shared inspector on click without leaving the page.

14. **`/principal/home` — `KpiTile` × 4** (`home/page.tsx:159`, `:165`, `:172`, `:179`)
    - Today: `<a href>` navigate; hover already uses `HoverPreview`
      `MetricPreview` (good). Add `detailHref` semantics: open a
      shared inspector with the underlying queue (`kind: "queue"`)
      before navigating, so a user who just wants to peek doesn't
      lose their scroll position.
15. **`/principal/home` — `EmergencyPulse` item** (`_retention/EmergencyPulse.tsx:25`)
    - Today: `<Link>` to `/principal/approvals?ticket=...`. Add a
      "quick inspect" mode that opens the shared inspector inline
      instead of navigating.
16. **`/principal/home` — `UpcomingPreview` item** (`_retention/UpcomingPreview.tsx:41`)
    - Same pattern as #15.
17. **`/principal/home` — `DelegationHealth` "Manage" link** (`_retention/DelegationHealth.tsx:25`)
    - Keep navigate; add a `HoverPreview` over the two counters with
      a `MetricPreview` hint (what counts as "expiring soon" = within
      3 days, per `/api/principal/dashboard`).
18. **`/principal/home` — `FocusZone` "View details" link** (`_retention/FocusZone.tsx:79`)
    - Today: `<Link>` to `item.href`. Add a "quick inspect" inline
      option alongside (or make the click open the inspector and the
      button navigate).
19. **`/principal/home` — `VpInboundCard` item** (`src/components/principal/VpInboundCard.tsx:80`)
    - Today: inline Ack/Resolve buttons. Add a "View original ticket"
      link that opens `/principal/approvals?ticket=<i.ticket_number>`
      so the principal can see the context that VP flagged.
20. **`/principal/home` — `NotificationCenter` / shell bell**
    - Today: shared `NotificationBell` / `PrincipalNotificationCenter`.
    - Add per-record inspection: click on a notification opens a
      shared inspector with `kind: "notification"` (the entity the
      notification points at) + "Mark read" action.

### P2 — Already works but on a local sheet; standardize

21. **`ApprovalsView` `DetailSheet`** (`.../_shared/DetailSheet.tsx`)
    - The local sheet wraps `PermissionDetailPanel`
      (`src/components/approver/PermissionDetailPanel.tsx`). This is a
      working decide-surface but bypasses the shared `EntityInspector`
      contract and the hover-preview layer (no hover preview on
      the row before click). Fix:
      - Add `HoverPreview` to each `DataTable` row + mobile card in
        `ApprovalsView` with a compact ticket preview.
      - Either keep the local sheet but feed it the same `EntityInspection`
        model, or replace the sheet with `EntityInspector` whose
        `detailHref` points to the local sheet (deepest layer).
    - File:line: `ApprovalsView.tsx:82` (mobile card), `:106`
      (`onRowClick`), `:127` (sheet render).

### P3 — Informational / by-design dead (no action required)

- `WeekBar` (`.../_shared/WeekBar.tsx:11`) — session counter; not a record.
- `StreakBadge` (`_retention/StreakBadge.tsx:11`) — motivational.
- `MorningBrief` (`_retention/MorningBrief.tsx`) — greeting + progress.
- `ChainImpact` (`_retention/ChainImpact.tsx`) — aggregation copy; only
  fixable by adding a "who is blocked on you" drill-down list, which
  would be a new feature, not an inspection fix.
- `InsightCard` (`_retention/InsightCard.tsx`) — copy only.
- `CelebrateOverlay` (`_retention/CelebrateOverlay.tsx`) — `pointer-events-none`.
- `ListSkeleton` (`_shared/ListSkeleton.tsx`) — loading placeholder.
- `ProfileView` (`.../_shared/ProfileView.tsx`) — today not rendered
  anywhere in the principal tree (`/principal/profile` uses a local
  card instead); if it is later wired, it should use `useEntityInspector`
  with `kind: "principal"` + a `PATCH /api/profile` action.

---

## 4. Backend TODOs blocking full inspector coverage

| # | Endpoint | Needed for | Status |
|---|---|---|---|
| B1 | Add `principal` to `GET /api/gates` role allow-list (`src/app/api/gates/route.ts:114`) | Gate inspector on P0.3 | Blocker |
| B2 | `GET /api/hostel/blocks/[block]` (per-block room occupancy + residents) | Rich hostel inspector on P0.4 | Missing |
| B3 | `PATCH /api/principal/delegations/[id]` (revoke / extend) | Delegation action on P0.7 | Missing |
| B4 | `GET /api/exam/access-exceptions/[id]` (per-exception detail) | Rich exam inspector on P0.6 | Missing |
| B5 | `?workflow_type=` filter on `GET /api/permissions` | ReportsView drill-down on P0.9 | Missing |
| B6 | `GET /api/permissions/[ticket]` is already available; extend `ApprovalsView` `?ticket=` deep-link to work on decided/overdue views (today it only auto-opens on the current status view, `ApprovalsView.tsx:34-44`) | WinFeed re-open on P0.13 | Partial |

---

## 5. Definition of done for each P0 item

For each P0 surface the fix is considered complete when:

1. Every record row/card in that view calls `inspect(model)` from
   `useEntityInspector` (`src/components/shared/useEntityInspector.tsx:20`).
2. The page renders `<EntityInspectorPanel inspection={...} onClose={...} />`
   once at the bottom of its JSX (per the pattern at
   `attention/page.tsx:154`, `cases/page.tsx:240`, etc.).
3. The `EntityInspection` model has:
   - `kind` = a stable entity identifier (`"department"` /
     `"gate"` / `"hostel_block"` / `"alert"` / `"exam_exception"` /
     `"delegation"` / `"audit_event"` / `"sla_cell"` / `"emergency"` /
     `"generated_pass"` / `"notification"`).
   - `title` + `subtitle` (identifier).
   - `status` (a badge ReactNode).
   - `sections[0]` = quick overview (mandatory, `docs/design/entity-inspection-system.md:41`).
   - `sections[1]` = context/relationships.
   - `sections[2]` = history (mandatory `collapsible: true`, same doc).
   - `sections[3]` = Actions OR `detailHref` (mandatory, same doc).
4. KPI tiles in the same view are wrapped in `HoverPreview` +
   `MetricPreview` and either navigate to the matching view or open the
   same inspector with `kind: "<entity>"` and a "view all" CTA.
5. A unit test under `tests/unit/` follows
   `tests/unit/entity-inspection.test.ts` and asserts the model contract
   for the new entity kind.

---

## 6. Suggested PR split (one PR per P0 item, or grouped)

- **PR-05A-1** (P0.1–3): departments + attendance-exceptions + gates
  (gate PR also includes B1 backend change: allow principal on
  `GET /api/gates`).
- **PR-05A-2** (P0.4–6): hostel blocks + alerts + exam exceptions
  (alert PR adds a `Resolve` button wired to `PATCH /api/alerts/[id]`).
- **PR-05A-3** (P0.7–10): delegations + audit + reports + SLA heatmap.
- **PR-05A-4** (P0.11–13): emergency + passes recent + WinFeed deep-link.
- **PR-05A-5** (P1.14–20): home KPI tiles + pulse + upcoming + focus
  zone + notification inspector.
- **PR-05A-6** (P2.21): ApprovalsView `HoverPreview` + inspector
  integration (leave the local sheet as the deepest layer).

Each PR is self-contained; the backend TODOs (B1–B6) ship in the same
PR as the view that needs them, so a P0 view fix never lands without
its supporting endpoint.
