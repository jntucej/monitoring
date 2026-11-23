# Principal Interaction-Completeness Matrix (PR-05A · §17)

Verified against the repository, 2026-11-23. Every row is populated from
actual code — routes, record shapes, and action verbs — not assumed.

## Levels (per spec §15)

- **L0 Dead** — record displayed, nothing happens. ❌ (not allowed)
- **L1 Navigation** — record → different page (context lost). ⚠️
- **L2 Inspection** — record → inspector → overview. ✅
- **L3 Investigation** — inspector + relationships + timeline + authority + evidence. ✅
- **L4 Decision** — context → authorized action → execution → verified result. 🔥

The rule: *a record being visible is not sufficient.* For every meaningful
record, the Principal can inspect it, understand its context, navigate to
related records, and perform every legitimately supported action — the deepest
level the underlying data + authority allow, **without inventing capabilities.**

## Matrix (current state after this programme)

| Route | Record | Click | Inspector | Context | Action (real verb) | Outcome / level |
|---|---|---|---|---|---|---|
| `/principal` Command Centre | KPI tile (Pending/Escalated/Overdue) | tile | — | drilldown to owning register | `drillTo` → filtered register | L1→L2 (tile → register → inspector) |
| `/principal` Command Centre | Incident row | row | ✅ EntityInspector | Overview + related gate/student + honest "unavailable" when unresolvable | Acknowledge / Resolve (`/api/emergency/alerts/[id]/acknowledge`, `/resolve`) | L4 (verify result, revalidate) |
| `/principal` Command Centre | Attention / escalation / decision ledger rows | row | ✅ register | context + authority | register-specific | L2–L3 |
| `/principal/approvals` | Permission ticket | row | ✅ DetailSheet → PermissionDetailPanel | Requester, status, SLA, reason, co-sign, forward scope | Approve / Reject / Return / Forward / Sign (`/permissions/[ticket]/forward`, `/sign`, `/revoke`, `/escalate`, `/amend`) | **L4** (execution feedback + audit link) |
| `/principal/approvals` | Decision history (own past decisions) | row | panel | outcome + timestamp | — (read-only review) | L2 |
| `/principal/operations/incidents` | Emergency alert | row | ✅ | severity, gate, student, timeline | Acknowledge / Resolve | L4 |
| `/principal/operations/gates` | Gate | row | ✅ buildGateInspection | name/code/location/status; related activity | View gate detail (`/operations/gates?gate=`) | L2 (action = legitimate view; no invented "restart") |
| `/principal/operations/hostel` | Hostel block | row | ✅ buildHostelInspection | occupancy/rooms/status | View hostel activity (`/operations/hostel?block=`) | L2 |
| `/principal/people/departments` | Department | row | ✅ buildDepartmentInspection | faculty/student/ratio/attendance/HOD | Inspect pending matters (`/people/departments?dept=`) | L2 (read-only entity — no fake actions) |
| `/principal/governance/delegations` | Delegation | row | ✅ buildDelegationInspection | delegate/scope/start/expiry/status | Review (`/governance/delegations?delegation=`); modify/revoke supported by `/api/principal/delegations` where authorized | L2–L3 |
| `/principal/examinations` | Exam exception / case | row | ✅ buildExamInspection | ticket/student/reason/status | Review case (`/examinations?case=`); exceptions via `/api/exam/access-exceptions` | L2–L3 |
| `/principal/governance/audit` | Audit event | row | ✅ buildAuditInspection | action/actor/role/when + structured details | — (accountability record; inspect only) | L2 (per spec §10 — audit = inspect, no action) |
| `/principal/cases` | Case | row | ✅ 4-section inspector (Overview→Risk&Authority→Timeline→Actions) | full context | supported actions | L4 (the reference pattern) |
| `/principal/people/attendance` | Absent / late / flagged person | row | ⚠️ currently list-only | attendance facts | — | **L1** — open gap, see "Open items" |

## Open items (honest — NOT yet closed)

> **Updated 2026-11-23:** deputy-warden + OIE (10 registers) and guardian
> (2 registers) are now L2 gateways (row → shared inspector, honest
> inspect-only where the role is not the decision authority). faculty
> my-classes + class-requests are wired. Remaining faculty/HOD/hostel rows
> were left row-only by a capped pass and are being wired in a follow-up.

1. **§12 Chart drilldown** — `StoryChart` is display-only. The `onPointClick`
   hook now exists on `ChartRenderer`/`StoryChart` but is only active when a
   caller supplies it; the Command Centre story has no weekly series yet
   (backend follow-up). No invented drill is shown.
2. **§13 Notification → inspector** — `PrincipalNotificationCenter` now
   accepts `onInspect`; record-backed notifications (ticket / alert) open the
   shared inspector, info-only ones stay mark-read. Wired on the Principal
   home page.
3. **Attendance exceptions (ExceptionsView)** — absent/late/flagged rows are
   still list-only (L1). *(deferred)*

## Role-coverage matrix (post-PR-05A)

| Role | Registers now L2 gateways | Left inspect-only (why) |
|---|---|---|
| principal | incidents, gates, hostel, departments, delegations, exam-cases, audit + KPI drilldowns + notification→inspector | — |
| deputy-warden | decision-history, gate-movement, incident-reporting, shift-handover | inspect-only: past decisions (immutable), live gate telemetry, escalation is chief-warden/hostel-manager only, shift logs are read-only |
| oie | access-exceptions, candidate-attendance, decision-history, exam-branch-coordination, examination-day-access, records | inspect-only: OIE is review-only (resolution = exam-branch/HOD office, per the page's own note); live scans are sensor data |
| guardian | child-requests, child-status | inspect-only: standard requests wait on school/approver; ward status + gate transit are read-only telemetry. Real guardian verbs shown only when authorized (`/api/parent/leave/acknowledge`, `/api/guardian/links/reverify`) |
| faculty | my-classes, class-requests (+ correction-requests follow-up) | correction = inspect-only (faculty recommend; HOD approves) |
| hod | (follow-up wiring) | inspection-only roster/attendance/reports |
| hostel | (follow-up wiring) | permissions decided by hostel-manager/principal tiers |

## No-invention rule applied

- Gates: **no "Restart Gate"** button — the legitimate action is *view
  activity / escalate / notify operator*, exposed only where the backend
  supports it (spec §9).
- Departments: read-only entity → **Inspect / view reports**, no fabricated
  approve/reject (spec §16).
- Audit events: **inspect only** — they are accountability records, not
  things to act on (spec §10/§16).
- Incidents: Acknowledge/Resolve exist and are the real verbs (L4).
- Approvals: Approve/Reject/Return/Forward/Sign are the real decision verbs
  (L4 — the target level for consequential workflows, spec §15).
