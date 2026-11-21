# Student Personas: In/Out Pass Types & Scenarios

Reference for the two student personas, every in/out (entry/exit) pass type,
the day-scholar scenarios, and the hosteller scenarios. Generated from the
live config in `src/lib/pass-types.ts` (the single source of truth the
`/student/permissions/new` form + approval-chain preview render from).

> Status: describes the **configured** approval chain (`approvalChain` per pass
> type). Note the enforcement gap flagged in `docs/` notes: the gate's live
> two-party approval (`gate_passes.guardian_status` + `admin_status`) is what
> actually releases a pass at the gate; the multi-stage `caretaker → … →
> principal` chain shown here is the *configured/preview* chain, not yet
> wired into stage-enforced gate release. See "Enforcement model" below.

---

## The two personas

The system models two "types of people" (personas), derived in
`usePersona()` from `user.persona` → `currentEntryType` → hostel
evidence (`hostelBlock`/`roomNumber`) → default:

| Persona | Who | Lives on campus | Curfew applies |
|---|---|---|---|
| **`day_scholar`** | Day scholar (comes to class, goes home each day) | No | No |
| ****`hosteller`** | Resident (lives in the hostel) | Yes | Yes |

A persona determines **which pass types are shown** (`passTypesForPersona`)
and **which home dashboard** renders (`/student` home: attendance/class focus
for day scholars, curfew/hostel/mess focus for hostellers).

---

## Pass-type catalogue

`category`: **entry** (coming in) / **exit** (going out) / **residence** (staying over) / **mess** / **leave**.

| Pass type | Persona | Category | Approval chain | Parent consent | Curfew | Expected return | Gate scan | Quota |
|---|---|---|---|---|---|---|---|---|
| **Late Arrival** | day_scholar | entry | Self | No | No | No | Yes | — |
| **Early Leave** | day_scholar | exit | Self | No | No | No | Yes | — |
| **Day Out** | day_scholar | exit | Self | No | No | No | No | — |
| **Event Pass** | day_scholar | exit | Faculty In-charge | No | No | No | Yes (invite attachment) | — |
| **Hostel Stay** | day_scholar | residence | Caretaker → Deputy Warden → Hostel Mgr → Principal | No | Yes | Yes | Yes | — |
| **Outpass (Home)** | hosteller | exit | Caretaker → Deputy Warden → Hostel Mgr → Principal | Yes (24 h) | Yes | Yes | Yes | 4 / month |
| **Night Out** | hosteller | exit | Caretaker → Deputy Warden → Hostel Mgr → Principal | Yes (24 h) | Yes | Yes | Yes | 2 / semester |
| **Local Outing (< 2 h)** | hosteller | exit | Caretaker → Deputy Warden → Hostel Mgr → Principal | No | Yes | Yes | Yes | — |
| **Mess Off** | hosteller | mess | Self | No | No | No | No | — |
| **Medical Leave** | hosteller | leave | Caretaker → Deputy Warden → Hostel Mgr → Principal → Medical | Yes | No | Yes | No | — |
| **Emergency Leave** | hosteller | leave | Caretaker → Principal | No | No | No | No | — |
| **Late Entry** | hosteller | entry | Caretaker → Deputy Warden → Hostel Mgr → Principal | No | Yes | No | Yes | — |

Legend: "Self" = no approver, the student submits and it's effective
(`requiresApproval = false`).

---

## Day-scholar scenarios (in / out)

A day scholar is on campus for the school day and leaves each evening. Their
scenarios:

| Scenario | Pass type | Approval | Notes |
|---|---|---|---|
| Arrives after morning gate close | **Late Arrival** | Self | Entry; gate scan for the record. |
| Leaves before dismissal | **Early Leave** | Self | Exit; gate scan; destination required. |
| Absent for a full school day | **Day Out** | Self | No gate scan, no expected return. |
| Campus-organised event outing | **Event Pass** | Faculty In-charge | 1–6 h; invitation attachment required. |
| Stays in hostel for the day (day scholar) | **Hostel Stay** | 4-stage hostel chain | Residence; curfew + expected return apply. |

Key policy (committed `e02f9b4f`): **day scholars do not need a teacher/HOD
approval for entry/exit** — Late Arrival and Early Leave are self-approved
(`requiresApproval = false`), so a day scholar can go/come whenever; the gate
scan is kept for the attendance record. (Before that change these two were
teacher-gated: `Late Arrival → Teacher` and `Early Leave → Teacher → HOD`.)

## Hosteller scenarios (in / out / stay)

A hosteller lives on campus, so every in/out is a controlled movement with
curfew + expected return:

| Scenario | Pass type | Approval | Consent | Notes |
|---|---|---|---|---|
| Goes home / to guardian address | **Outpass (Home)** | 4-stage chain | Yes (24 h) | Min 2 h, max 72 h; 4/month quota; mess-off coupled. |
| Out overnight (family/medical) | **Night Out** | 4-stage chain | Yes (24 h) | Min 12 h, max 48 h; 2/semester quota. |
| Short trip in the town (< 2 h) | **Local Outing** | 4-stage chain | No | No guardian address required. |
| Late arrival to hostel | **Late Entry** | 4-stage chain | No | Entry; curfew applies. |
| Mess suspension | **Mess Off** | Self | No | 1–7 days; not a movement. |
| Illness / hospital | **Medical Leave** | 4-stage + Medical | Yes | Up to 30 days; expected return. |
| Sudden family emergency | **Emergency Leave** | Caretaker → Principal (2 hops) | No | Up to 72 h; expedited 2-stage chain. |

---

## The 4-stage hostel approval chain (shared)

`caretaker → deputy_warden → hostel_manager → principal` is the configured
chain for all hosteller residence movements (outpass/night/local/late-entry)
and for day-scholar `Hostel Stay`. The `warden` role is normalised to
`hostel_manager` (`normalizeRole` in `permission-workflow.ts`). The
**Emergency Leave** variant short-circuits to `caretaker → principal`.

### Enforcement model (important)
- **Configured/preview chain**: the table above — shown in the pass form and
  `/api/permissions/preview`.
- **Live gate enforcement**: the `gate_passes` table uses a **two-party**
  model — `guardian_status` (parent) + `admin_status` (hostel admin) →
  `final_status`. The gate scan consumes a pass only when `final_status` is
  APPROVED and records `used_at`.
- **Gap**: the multi-stage caretaker→…→principal chain is **not yet
  stage-enforced** at the gate; it is the preview/configured intent. Closing
  the gap = either (a) wire stage tracking into `gate_passes`, or (b) align
  the preview to the actual two-party model. Tracked as an open item; no code
  changed in this doc.

---

## Dashboard mapping (persona → home)

- **Day scholar home**: attendance % (MyStats) + today's classes/meal (MyDay)
  + today status; no curfew focus.
- **Hosteller home**: curfew status (TodayStatus) + active hostel pass (QR)
  + curfew/residence context.
- Shared chrome on both: greeting, sakuga console, offline banner, onboarding,
  quick links, guardian call, campus pulse.

Persona resolution: explicit `user.persona` → `currentEntryType`
(hosteller/day_scholar) → hostel block/room evidence → default day_scholar.

---

## Categorical people: roles, their dashboards, endpoints & provided features

Beyond the two student personas, the system models 29 role categories
(`config_roles_registry`). Each role gets a home **console/dashboard**, a set of
**API endpoint groups**, and **features** (what it can view/do). Grouped below
by function.

Legend for "features": **view** = read-only dashboard/data; **act** = can
create/approve/modify; **admin** = config/system.

### Students & families
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `student` (day_scholar / hosteller) | `/student` (persona-aware home) | `/api/student/*`, `/api/permissions`, `/api/class-requests`, `/api/pass*`, `/api/notifications` | view own attendance/classes/curfew/passes; act: raise class requests, request passes, read announcements |
| `guardian` / `parent` | `/guardian` | `/api/guardian`, `/api/parent`, `/api/approver/*` | view child status/attendance; act: approve/reject child's passes (two-party `guardian_status`), emergency contact |

### Gate & campus operations
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `operator` | `/operator` | `/api/operator`, `/api/gate/*`, `/api/lockdown` | act: gate scans (in/out), pass verification, lockdown toggle, device status |
| `supervisor` | `/supervisor` | `/api/supervisor`, `/api/gates` | view gate movement, operator queue; act: resolve gate incidents |
| `visitor` | `/visitor` | `/api/visitors`, `/api/gate/verify-pass` | view own visit; act: check in/out, view assigned gate |

### Hostel / warden hierarchy (resident movements)
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `caretaker` | `/hostel/permissions` | `/api/caretaker`, `/api/permissions` | act: approve hostel movements (stage 1), manage maintenance/workers |
| `deputy_warden` | `/deputy-warden` | `/api/deputy-warden`, `/api/approver/*` | act: hostel movements (stage 2), outpass queue, leave requests, curfew oversight |
| `hostel_manager` | `/hostel-manager` | `/api/hostel-manager` | act: hostel movements (stage 3), rooms, allocation, housekeeping; `warden` normalises here |
| `principal` (warden) | `/principal/approvals` | `/api/principal`, `/api/approver/*` | act: final hostel approval (stage 4), delegate, decision history, cross-dept oversight |

### Academic
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `faculty` | `/faculty/permissions` | `/api/faculty`, `/api/faculty-assignments`, `/api/teaching-bindings`, `/api/class-coordinators` | view own bindings; act: grade marks, post assignments, approve academic passes, appoint coordinator |
| `hod` | `/hod` | `/api/hod/*` | view dept faculty/students/attendance; act: dept approvals, escalate, reports |
| `oie` | `/oie` | `/api/oie`, `/api/exam` | act: exam paper release, internal marks, eligibility |
| `exam_branch` | `/exam-branch` | `/api/exam`, `/api/exam/superintendent` | act: hall tickets, exam scheduling, results pipeline |
| `exam_superintendent` | `/exam/superintendent` | `/api/exam/*` | act: supervisory exam sign-off, publish results (two-person SoD) |
| `controller_examinations` | `/exam-branch` | `/api/exam` | act: controller-level exam policy, result certification |
| `addl_controller_academic` / `_results` / `_automation` | `/exam-branch` | `/api/exam` | act: additional-controller exam duties (academic / results / automation) |
| `dean` | (principal-level) | `/api/hod`, `/api/principal` | view: cross-program academic oversight |

### Mess / health / welfare
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `mess_incharge` | `/mess` | `/api/mess` | act: mess tokens, special events, eligibility, meal opt-in/out |
| `emo` | `/emo` | `/api/emergency`, `/api/notifications` | act: emergency broadcast, SOS response, welfare escalation |

### Administration & system
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `admin` | `/admin` | `/api/admin/*`, `/api/academic-automation`, `/api/config/*` | act: institution config, academic-automation rules + autonomy panel, alerts, announcements, SMS |
| `sysadmin` | `/sysadmin` | `/api/sysadmin/*`, `/api/deployment`, `/api/cron/*` | admin: role registry, security settings, docker/services, cron jobs, audit logs |
| `staff` | `/staff` | `/api/staff` | view: staff directory, leave |
| `vice_principal` | `/vice-principal` | `/api/vp`, `/api/approver/*` | act: VP-level approvals, academic escalation (VP→Principal ladder) |

### Automation layer (non-human actors)
| Role | Dashboard | Primary endpoints | Features provided |
|---|---|---|---|
| `agent` (system) | — | `/api/cron/*` (class-issue-aggregation, exam-eligibility, academic-automation) | autonomous: aggregate class issues, fire policy rules, write explain-why audit; bounded by `automation_controls` kill-switch + autonomy level |

> "Chief warden" is **not** a distinct user — `chief_warden` is a role
> context on the Principal (one-person warden model). UI/audit wording
> reads "Principal (warden)".

### Endpoints provided by the academic-automation engine (this build)
- `POST /api/cron/academic-automation` — fire configurable rules (event + sweep modes).
- `GET  /api/academic-automation` — list rules / autonomy levels / agent registry / recent explain-why runs.
- `POST /api/academic-automation/rule` — upsert a versioned policy rule (Rule Builder).
- `POST /api/academic-automation/toggle` — kill-switch an agent.
- `POST /api/academic-automation/override` — set/clear an inherited policy value.

---

*Source of truth: `src/lib/pass-types.ts` (PASS_TYPE_SEED),
`src/lib/permission-workflow.ts` (WORKFLOW_STAGES), `gate_passes` schema,
`src/hooks/usePersona.ts`, `src/server/policy/routes.ts` (role→console),
`src/app/api/*` (endpoint groups), `config_roles_registry` (role list).
Regenerate this doc when these change.*
