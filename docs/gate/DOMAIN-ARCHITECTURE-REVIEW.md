# Gate Monitoring — Long-Term Domain Model & Configurable Operational Foundation

Grounded against the **live** `jntucej/monitoring` schema (298 migrations, node-postgres,
Postgres `public.*`). Re-verified against the newest commits: the config-driven
subsystems are now joined by `worker_types`/`worker_assignments`/
`worker_attendance_logs` (GPS in/out), `campus_locations.occupant_type`,
`circular_pipeline` (OCR → Principal approval queue → fan-out/Noted),
`shift_handover_requests`, `achievements`, and `activity_feed`.
This is a domain/systems review, not a UI review.

---

## 0. Executive verdict

The system is far more mature than a naive gate app. It already has a real
config-driven foundation:

- `workflow_definitions` / `workflow_instances` / `workflow_transitions` — configurable state machines
- `authority_policies` / `role_contexts` — who-may-do (bounded, versioned) separated from who-you-are (role)
- `ops_rules` — versioned operational numbers (curfew, leave thresholds, meal cutoffs, attendance mins, confirmation chains). "Every automation reads ops_rules, never a hard-coded literal."
- `ref_categories` — premade, migration-seeded taxonomies (visitor category, id doc type, curfew window…)
- `gate_field_blueprints` — (role × gate_type × event_type × context) → field lists; operator visibility is config-driven
- `entity_scopes` — entity map roles bind to
- `campus_locations` — spatial locations (gate/building/hostel_block/lab/…) with geo + `occupant_type` (students/faculty/staff/mixed)
- `circular_pipeline` — OCR extraction → schema-constrained target classifier → Principal approval queue (`circular_requests` with draft→pending_vp→pending_principal→approved/published) → fan-out + "Noted" compliance receipts
- `worker_types` / `worker_assignments` / `worker_attendance_logs` — worker taxonomy via `ref_categories(worker_type)`, block/shift assignments, GPS in/out attendance
- `achievements` / `activity_feed` / `campus_feed` — engagement & presence surfaces
- `shift_handover_requests` — operator shift handover workflow

**The central gap (still live, re-confirmed in the newest commits):** the academic
core is *string-encoded and undated*.
`student_details.department/branch/semester/regulation/admission_date` are
free-text; `classes` keys on a bare integer `year`; and **`src/lib/rollNumber.ts`
computes year-of-study, batch, and graduation from a roll-number string** —
baking in the July-1 academic-year convention, B.Tech=4 / M.Tech=2 durations,
"5A = lateral → year 2", college short "JJ (UCEJ)", and department codes.

That is the "treated as fixed but should be configurable/versioned" answer:

> **Academic progression (year, semester, batch, regulation, program, entry
> mode, graduation year) is currently derived from a roll-number string and
> free-text columns, not from versioned academic entities. Every one of those
> values is time-dependent, and none of them carries an effective-from /
> effective-to / version. Historical gate records therefore can't be pinned to
> the academic status that was true *when the scan happened*.**

Everything below is organized around fixing that while preserving the
config-driven work that already exists.

---

## 1. Structurally-fixed entities (stable institutional structure)

For each: representation · permanence · owner · dependents · historical-preservation.

| Entity | Represents | Permanence | Who controls | Depends on it | Must history keep old value? |
|---|---|---|---|---|---|
| **Institution / College** | UCEJ; "JJ" short | Permanent | Registrar | Everything (roll format, AY convention, entry modes) | Yes (roll format is versioned) |
| **Campus** | Physical location(s) | Permanent (may add) | Admin | Buildings, gates, locations | Yes (parent_id of locations) |
| **Academic Year** | e.g. AY 2024-25, Jul 1 start | Semi-permanent, **recurring annually** | Academic office | Semesters, batches, timetables, calendars | Yes — year must be an entity, not a convention |
| **Semester** | 1–2 sessions within an AY | Recurring, per-AY | Academic office | Timetables, exams, fee cycles | Yes |
| **Regulation** | e.g. JNTUH 2022/2019 scheme | Semi-permanent, **versioned** | Academic office | Programs, progression rules, curriculum | Yes — a student's regulation is fixed at admission |
| **Program / Degree** | B.Tech, M.Tech, HSS | Semi-permanent; grows | Dean/Registrar | Branches, duration, curriculum | Yes |
| **Branch / Specialization** | IT, CSE, ECE, AI&DS… | **Frequently changing** (renames, merges, splits, new) | HOD / Dean | Departments, classes, students | Yes — a rename is not a delete |
| **Department** | EEE/ME/ECE/CSE/IT/PHY/CHEM/MATH/ENG | Semi-permanent (seeded in `entity_scopes`, `ref_categories`) | HOD | Faculty, classes, staff leave scoping | Yes |
| **Batch / Cohort** | Admission AY cohort (24JJ) | Permanent per-AY | Registrar | Students, expected graduation | Yes |
| **Year of study** | 1–4 / 1–2 | **Derived, time-dependent** | — (computed) | Gate access, class, section | Yes — snapshot per event |
| **Section** | A/B/C within a class | Per-AY/semester | Academic office | Students, rooms, timetables | Yes |
| **Student category / entry mode** | Regular (1A), Lateral (5A), etc. | Semi-permanent; grows | Registrar | Admission → year-of-entry mapping | Yes |
| **Hostel / hostel block** | Boys/Girls A/B | Semi-permanent; may add | Warden | Student presence, leave chains | Yes |
| **Building / Room / Lab** | Physical infra | Semi-permanent | Facilities | Class scheduling, access | Yes |
| **Gate / entry-exit point** | Main, hostel, parking… | Semi-permanent; may add | Security ops | movement_logs, readers | Yes — gate_id on events |
| **Administrative unit / Authority** | Academic office, security, exam desk | Semi-permanent | Admin | Roles, approval chains | Yes |
| **Role** | admin, hod, warden, examiner… | **Extensible** (registry) | Admin | Permissions, workflow transition_roles | Yes (deactivate, don't delete) |
| **Parent/guardian link** | Consent, notifications | Per-student | Registrar | Notification delivery | Yes (history of who was guardian) |
| **Faculty relationship** | Faculty ↔ class ↔ subject, time-boxed | Per-AY/semester, **time-boxed** | HOD | Assignments, attendance | Yes |
| **Transport / vehicle** | Buses, vehicles | Semi-permanent | Transport in-charge | Access groups | Yes |

> Do NOT assume "branch" or "course" is permanent. In this repo a branch is
> free-text in `student_details.branch` and a department is a seeded code.
> Both must be *entities* with effective-dates and a stable code that survives rename.

---

## 2. What changes each academic cycle

| Change | Today's representation | How it should be represented without touching history |
|---|---|---|
| New batch / AY | roll string + `admission_date text` | `academic_years` + `batches` rows; student batch = FK |
| Year progression 1→2→3→4 | computed by `rollNumber.ts` from string | **Derived** from (admission AY, entry-mode, regulation, duration) — recomputed, never stored as mutable |
| Student completes course | none (no graduation event) | `student_academic_history` append: `graduated_on`, regulation |
| Repeat / detain / year-back | not modeled | `student_academic_history` append: `detained`, `year_back` flag, new effective-date |
| Branch change | overwrite `branch text` | append a row: branch `effective_from`/`effective_to`; old row preserved |
| Section change | overwrite | append `class_assignment` row (time-boxed) |
| Transfer / readmission | not modeled | append row: `readmitted`, new admission AY, new batch |
| Withdraw / graduate | `users.deleted_at` (soft) | append `withdrawn_on` / `graduated_on` |
| New / revised regulation | `regulation text` | `regulations` versioned entity; student pinned to the one at admission |
| New / revised curriculum | — | `curricula` versioned per (regulation, program, year) |
| New timetable / calendar / holidays / exams | hard-coded conventions + ops_rules | per-AY `timetables`, `academic_calendars`, `examination_schedules` (time-boxed) |
| New faculty assignment | `faculty_assignments` (per class+subject) | add effective-from/to so it's time-boxed, not just "current" |
| New hostel allocation | `hostel_block` | time-boxed `hostel_allocations` |

**Principle:** a student's academic state is a *timeline of facts*, not a
mutable record. Every transition appends a row with an effective window. The
"current" value is the row whose window contains `now`; history is the union
of all rows. Gate events capture the row that was live *at event time*.

---

## 3. Current state vs historical state (the snapshot problem)

The example the brief demands:

> A student is **currently** 3rd Year → IT → Batch 2024.
> A gate scan 8 months ago happened when they were **2nd Year** → IT → Batch 2024.

That old scan must not retroactively read "3rd year." Required, per field:

| Field | Current | Needs effective-from | Needs effective-to | Needs version | Needs AY association | Needs semester association |
|---|---|---|---|---|---|---|
| year of study | derived | ✓ | ✓ | n/a (derived) | ✓ | ✓ |
| branch | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| section | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| regulation | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| batch | ✓ | fixed at admission | n/a (immutable) | n/a | ✓ | n/a |
| academic status (debar/detain/withdraw) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| class/section | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| faculty assignment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| hostel block | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| gate access validity / visitor approval | ✓ | ✓ | ✓ | n/a | n/a | n/a |
| curfew / leave threshold (ops_rules) | ✓ | ✓ (already!) | ✓ | ✓ | n/a | n/a |

`ops_rules` already models this (effective_from/to + version). The academic
core does **not**. That is the asymmetry to close.

**Historical record must preserve the old value:** every `movement_log`,
`gate_pass`, `visitor_log`, `exam_access_exception`, and `student_presence`
state transition must snapshot the academic fields *at event time* (or keep
an FK to the then-current academic-history row), so a later branch/year change
never rewrites the past.

---

## 4. Configuration vs hard-coded logic (A–E)

| Class | Definition | Concrete example in THIS system |
|---|---|---|
| **A. Hard-coded invariant** | Almost never changes | Gate must log both directions; a scan has one reader + one person; audit log is append-only; RLS is on; the *July-1 academic-year boundary* itself |
| **B. Configurable institutional setting** | Admins change via UI/API | Curfew window, leave threshold durations, meal cutoff, attendance minimum %, which roles may approve a given event |
| **C. Time-versioned configuration** | Changes per AY/semester | AY start convention (if it ever moves), per-AY timetable, per-AY holidays/exams, regulation version in force |
| **D. Operational data** | Changes daily | Today's gate open/close, a specific visitor approval, a shift roster, a campus event |
| **E. Derived data** | Compute, don't store | Year of study, expected graduation year, batch label, "is this scan within curfew", "is this student eligible to enter right now" |

**Rule:** the system must *not* require a code change when the institution adds
a branch / course / batch / regulation / AY / building / gate / timetable / role /
operational rule. Today:

- New branch → **code change** (free-text + roll-code assumptions). ❌
- New regulation → **code change** (rollNumber bakes durations/entry-modes). ❌
- New gate → add a row to `gates`/`campus_locations` — mostly OK. ✓
- New AY → today relies on `currentAcademicYearStart()` (July-1) in code; a
  new AY should be a *data row* with its own start. ❌ (partly)
- New role → `role_registry` exists (extensible). ✓
- New operational number → `ops_rules` (config-driven). ✓

**Fix:** move A/B/C into data. `rollNumber.ts`'s academic-year convention,
entry-mode→start-year map, and program→duration map must become
versioned reference entities (`entry_modes`, `program_durations`), not code.

---

## 5. Academic progression — model it, don't hard-code it

**Do not** store `year = 3`. Model:

- `admission_year` (FK to `academic_years`)
- `entry_mode` (FK: Regular 1A, Lateral 5A, …) → determines **starting year**
- `batch` (immutable, = admission AY)
- `regulation` (versioned, fixed at admission)
- `program` (B.Tech/M.Tech) → `duration_years` (FK to `program_durations`)
- `branch`, `section` (time-versioned)
- `academic_status` (workflow: active/detained/debarred/withdrawn/graduated)

**Derive, don't store:**
- `expected_graduation_year = admission_ay + duration_years` (M.Tech=2, B.Tech=4)
- `current_year_of_study = base_year(entry_mode) + (current_ay_start - admission_ay)`, clamped to `[1, duration]`
- `is_graduated = now > expected window and no repeat`

**Edge cases the derivation must handle (rules, not special-casing):**

- *Regular 2024* → 1st in AY24-25 … 4th in AY27-28. (matches `rollNumber.ts`)
- *Lateral 5A 2024* → base year 2, so 2nd in AY24-25; graduates with the 2024 regular cohort. (matches `rollNumber.ts` "5A joins directly into year 2")
- *Repeats 2nd year* → `student_academic_history` appends `detained`/`year_back`; the derivation shifts the *current* AY by +1, expected graduation +1; history rows unchanged.
- *Branch change* → append branch row with new effective_from; derivation unaffected; gate snapshots old branch until the window moves.
- *Readmission after break* → new admission_ay, new batch; prior history preserved as a separate episode.
- *Completes requirements late* → `graduated_on` may exceed expected window; expected stays the invariant, actual is recorded.

**The key move:** make the derivation a *query over versioned entities*, not a
string parser. `rollNumber.ts` becomes a **decoder only** (roll → admission_ay,
entry_mode, department, serial), and everything else is computed from data.

---

## 6. Academic structure evolution (renames / merges / splits / new)

Model each as a **versioned entity with a stable code + effective dates**, and
a *rename chain* (old label → new label, not a delete):

- **Program:** add a row (AI&DS), effective_from; old programs keep their
  effective_to (or stay open-ended).
- **Branch rename IT → "IT (Data Science)":** append `branch.renames` row or a
  new version; students pointing at old branch code still resolve.
- **Merge two branches:** mark both `merged_into` a target; historical records
  still cite the source; new students use the target.
- **Split:** a branch forks into two with effective_from; cohort stays with
  the parent until the split date.
- **Discontinue:** set `is_active=false`, keep effective_to open for history;
  new admissions stop, existing students finish under their regulation.
- **Regulation change:** new `regulations` version; incoming students take it,
  existing students stay on the old one (pinned at admission).

**Effective-date rule:** a branch/program/regulation row is the
*current* version when `effective_from <= now < effective_to`; history is the
union of all rows. Never delete or mutate a historical row — add a new version.

---

## 7. Timetable & operational schedules (make them configurable)

| Schedule | Recurring? | Scope | Representation |
|---|---|---|---|
| Class timetable | Recurring per-semester | AY+semester+class | `timetables` rows (class, day, slot, subject, room), versioned per-AY |
| Working hours / gate open-close | Recurring, exceptions | Daily + date-specific | `gate_schedules` (day → open/close) + `schedule_exceptions` (specific date overrides) |
| Entry / exit windows | Recurring | Per-gate | `gate_schedules` per gate |
| Lunch breaks | Recurring | Campus | `gate_schedules` / `breaks` |
| Examination schedule | One-time per-AY | AY | `examination_schedules` + `exam_day_state` (exists) |
| Holidays / working days | Recurring per-AY | AY | `academic_calendars` (working days + holidays) |
| Weekend rules | Recurring | Global/ops | `ops_rules` (day-of-week config) |
| Special working days / events | One-time | Date-specific | `campus_events` (exists) + `schedule_exceptions` |
| Hostel schedules (curfew) | Recurring + exceptions | Hostel block | `ops_rules` curfew_window (already) + exceptions |
| Visitor / staff schedules | One-time / recurring | Per-visitor/role | `visitor_approvals` (with expiry) + `staff_schedules` |
| Gate duty / security shifts | Recurring | Post + shift | `security_posts` / `security_shifts` (exist) |
| Shift schedules | Recurring | Role | `shifts` |

**Exception model (the "Normal Monday 8:00 / Exam Monday 7:00" case):**
Base = `gate_schedules` (recurring rule). Override = `schedule_exceptions`
row: `(gate_id, date, open_time, close_time, reason, approved_by)`.
Resolution priority: **exception (date) > recurring (day-of-week) > global default**,
scoped per gate. The exam-day override is just an exception keyed to the exam date.

Every schedule must carry scope (gate/hostel/campus) + effective window so it
survives AY/semester changes.

---

## 8. Deadlines & institutional dates

| Deadline | Fixed? | Recurring? | AY-specific? | Sem-specific? | Configurable? | Depends-on? |
|---|---|---|---|---|---|---|
| Admission deadline | one-time | yearly | ✓ | ✓ | ✓ | AY open |
| Registration / course-reg | one-time | per-sem | ✓ | ✓ | ✓ | semester start |
| Fee deadline | one-time | per-sem | ✓ | ✓ | ✓ | registration |
| Exam registration / hall-ticket | one-time | per-exam | ✓ | ✓ | ✓ | exam schedule |
| Hostel registration | one-time | yearly | ✓ | — | ✓ | admission |
| Document submission | one-time | per-AY | ✓ | ✓ | ✓ | registration |
| ID-card issuance | event | per-student | — | — | ✓ | admission |
| Scholarship | one-time | yearly | ✓ | ✓ | ✓ | AY |
| Semester start/end | recurring | per-AY | ✓ | ✓ | ✓ | academic calendar |
| Exam dates / results | recurring | per-sem | ✓ | ✓ | ✓ | exam schedule |
| Graduation | recurring | yearly | ✓ | — | ✓ | expected graduation |
| **Gate/access validity** | event | per-grant | — | — | ✓ | visitor approval / leave |
| **Visitor approval expiry** | event | per-approval | — | — | ✓ | approval issued_at |
| **Temporary access expiry** | event | per-grant | — | — | ✓ | issuance + duration |

**Representation:** a `deadlines` / `date_rules` table with
`(type, scope, effective_from, effective_to, depends_on)`. Recurring ones are
*templates* per-AY; one-time are concrete instances. Access-validity expiries
are **derived** (issued_at + duration from `ops_rules`), not manually stored.

---

## 9. Infrastructure inventory (first-class entities)

Every device/building needs: `unique_id · location · owner · responsible_person ·
status · install_date · maintenance_log · model/version · connectivity ·
health · replacement_history · dependencies · failure_state · decommission_state`.

| Category | Today's representation | Gap |
|---|---|---|
| Gates | `gates` (id, type, location) + `campus_locations(kind='gate')` | No install date / health / replacement |
| RFID readers / QR scanners | not explicit entities | **Missing** — a scan event should reference the reader |
| Access-control devices, cameras, servers, network, Wi-Fi AP, printers, displays, UPS, power | not modeled | **Missing** |
| Buildings / rooms / labs | `campus_locations` + `classes.room_number` (text) | Room should be a location entity, not a string |
| Hostels / hostel blocks | `hostel_block` (text) + `entity_scopes` | Should be a location entity with status |
| Sensors / controllers / kiosks / mobile / emergency (SOS) | `sos` (exists), no inventory | SOS exists; no device inventory |

**Upgrade handling (R1 → R2):** a reader/device gets a `retired_at` +
`replaced_by`. Historical scans keep `reader_id=R1`; new scans use `R2`.
Never delete R1 — archive with `decommission_state`. Device **identity is a
stable key**; the physical unit is swappable behind that key.

**Health/failure:** a `device_health` (heartbeat last_seen, online/offline)
drives "what happens when a reader goes offline" — an operational rule, not code.

---

## 10. Infrastructure expansion — where extensibility is needed

Admins must add, **without source changes**: new gate, reader, building,
hostel, server, department, branch, course, batch, role, access point, sensor,
device type.

Extensibility required at:
1. **Entity catalogs:** departments, branches, programs, device types, roles
   must be *rows in registries*, not code constants. (Roles ✓, departments ✗,
   branches ✗, device types ✗ today.)
2. **`ref_categories`:** new taxonomy value = new row (already designed for this).
3. **`ops_rules`:** new operational number = new row (already designed).
4. **`gate_field_blueprints`:** new (role×gate×event×context) field set = new row.
5. **`workflow_definitions`:** new case type = new state machine row.
6. **`schedule_exceptions`:** new gate/schedule override = new row.

**The one invariant:** the application core reads *registries + ops_rules +
blueprints + workflows*; it never enumerates institutional values. That is the
line between "extensible" and "hard-coded."

---

## 11. Relationships & dependencies (graph + cardinality)

Primary chains:
```
Institution → Campus → Building → Gate → Reader → (Entry/Exit Event)
Institution → Academic Year → Regulation → Program → Branch → Batch → Student
Academic Year → Semester → Timetable → Class → Section → Student
Student → (time-versioned) Academic Status / Year / Section
Role → (authority_policy) → transition authority
```

Cardinality / flags:

| Relationship | Type | Cardinality | Time-dependent? | Optional? | Historical? | Derived? |
|---|---|---|---|---|---|---|
| AY → Semester | 1:N | 1:N | ✓ | — | ✓ | — |
| AY → Batch | 1:N | 1:N | ✓ | — | ✓ | — |
| Regulation → Program | 1:N | 1:N | ✓ | — | ✓ | — |
| Program → Branch | 1:N | 1:N | ✓ | ✓ | ✓ | — |
| Batch → Student | 1:N | 1:N | — | ✓ | ✓ | — |
| Student → AcademicStatus | timeline | 1:N | ✓ | — | ✓ | partially |
| Student → YearOfStudy | **derived** | 1:N snapshots | ✓ | — | ✓ | **yes** |
| Class → Section | 1:1 | 1:1 | ✓ | — | ✓ | — |
| Class → Faculty (subject) | M:N time-boxed | M:N | ✓ | ✓ | ✓ | — |
| Gate → Reader | 1:N | 1:N | — | — | ✓ | — |
| Gate → Event | 1:N | 1:N | — | ✓ | ✓ | — |
| Role → AuthorityPolicy | M:N | M:N | ✓ | ✓ | ✓ | — |
| Student → HostelBlock | time-boxed | M:N | ✓ | ✓ | ✓ | — |
| Guardian → Student | M:1 | M:1 | ✓ | — | ✓ | — |

The **derived** rows (YearOfStudy, batch label, graduation year, "can enter
now") are the ones that must *never* be stored as mutable truth.

---

## 12. Rules engine — lift rules out of code

| Rule | Class |
|---|---|
| Who can enter (student/staff/visitor) | Role-based + Security |
| When a student may enter (class hours, curfew, leave) | Time-based + Academic |
| When a visitor may enter (approval window, host, gate) | Role-based + Time-based |
| Which gate a person may use | Role-based + Config |
| Access-group membership | Config (extensible) |
| Post-expiry access | Exception + Config |
| Holiday behavior | Time-based |
| Examination-day behavior | Time-based + Academic |
| Student detained/debarred | Academic + Security |
| Student graduated → access ends | Academic + Security |
| Reader offline → fallback | Infrastructure |
| Duplicate RFID event → dedupe | Invariant + Operational |
| Entered but not exited → alarm | Operational (presence) |
| Device replaced → rebind | Infrastructure |
| Who approves exceptional access | Role-based (authority_policies) |

Target split:
- **Invariant rules** stay in code (dedup, append-only audit, RLS).
- **Configurable / time / role / academic / infra / exception / security**
  rules move to `ops_rules`, `authority_policies`, `workflow_definitions`,
  `gate_field_blueprints`, `schedule_exceptions`, and `ref_categories`.

The system already says the right thing in the `ops_rules` comment: *"every
automation reads ops_rules, never a hard-coded literal."* Extend that to the
academic rules (year/branch/regulation) and the presence/exit rules.

---

## 13. Defaults — safe vs must-configure

**Safe defaults (auto on create):**
- New AY → default 2 semesters, default working calendar (Mon–Sat), default
  gate open/close times.
- New gate → operational `active=true`, default event types (IN/OUT/visitor).
- New reader → health monitor on, heartbeat interval default, `unknown` state.
- New student → academic_status = active, default access policy (student),
  presence = unknown.
- New branch → default progression structure (4-yr B.Tech template).

**Must be explicitly configured (never invent):**
- Curfew times, leave thresholds, approval chains, which roles may approve
  which event, examination-day overrides, fee/exam deadlines, hostel
  allocations, guardian notifications.

**Rule:** the system may *propose* a default; it must **not silently apply an
institutional policy** the institution hasn't decided. Where a value is
policy (curfew, deadline, authority), it is `ops_rules`-driven and defaults to
"not set → deny / require approval," not a guessed number.

---

## 14. Future-proofing — what breaks in 5 years

| Change | Today's breakage | Fix |
|---|---|---|
| +5 branches | free-text branch + roll code | Branch registry |
| Branch rename | overwrites history | Rename chain / version |
| Discontinue branch | no state | `is_active=false`, finishers stay |
| New degree | program=4yr/2yr in code | `program_durations` entity |
| Regulation change | `regulation text` | versioned `regulations` |
| Course structure change | none | versioned `curricula` |
| Repeat years | no model | `student_academic_history` |
| Transfer | no model | multi-episode admission |
| New hostel | `hostel_block text` | hostel location entity |
| New gate | row add (OK) | + reader device entity |
| RFID tech change | reader id implicit | device identity key + replacement |
| New access method | no abstraction | `access_credentials` type-extensible |
| Timetable / calendar change | code conventions | per-AY schedule entities |
| Multiple campuses | single campus implicit | Campus as first-class root |
| New admin role | role_registry (OK) | + authority_policy row |
| Institutional rule change | scattered code | ops_rules / workflows |

**Would-break:** the academic core (string + bare-integer + code-baked
durations/entry-modes), device identity (no reader entity), multi-campus
(single-campus assumption), hostel/branch as text.

---

## 15. Migration & lifecycle

Preferred lifecycle: `Draft → Active → (Modified) → Deprecated → Archived`.
**Deletion disallowed** for anything historical records reference — use
deactivation/archiving (a gate, branch, role, reader, AY).

| Entity | Soft-delete? | Versioned? | Effective-dates? | Audit | Change-tracked | Approval | Data-migration |
|---|---|---|---|---|---|---|---|
| Branch / Program / Regulation | archive | ✓ | ✓ | ✓ | ✓ | Academic office | Backfill students |
| AY / Semester | keep | ✓ | ✓ | ✓ | ✓ | — | — |
| Gate / Reader / Device | archive | — | ✓ (install/retire) | ✓ | ✓ | Security ops | Rebind to replacement |
| Role | deactivate | ✓ | ✓ | ✓ | ✓ | Admin | Reassign |
| Student academic history | append-only | ✓ | ✓ | ✓ | ✓ | HOD | — |
| Timetable / Calendar | per-AY | ✓ | ✓ | ✓ | ✓ | Academic office | Migrate to new AY |

**Audit history** (append-only) already exists (`audit_logs`, pgaudit,
`audit_actions`). Tie every academic/infra change to it.

---

## 16. Final domain inventory

| Entity | Purpose | Changes freq? | Time-versioned? | Historical? | Configurable? | Dependencies | Lifecycle |
|---|---|---|---|---|---|---|---|
| Institution/Campus | Root | Rare | — | ✓ | ✓ | — | Permanent |
| AcademicYear | Time container | Yearly | ✓ | ✓ | ✓ | — | Per-AY |
| Semester | Session | Per-AY | ✓ | ✓ | ✓ | AY | Per-AY |
| Regulation | Scheme | Rare | ✓ | ✓ | ✓ | Program | Versioned |
| Program/Degree | Degree type | Rare | ✓ | ✓ | ✓ | — | Versioned |
| Branch | Specialization | Frequent | ✓ | ✓ | ✓ | Program | Archive on discontinue |
| Batch | Cohort | Yearly | ✓ | ✓ | ✓ | AY | Permanent per-AY |
| Section | Teaching split | Per-sem | ✓ | ✓ | ✓ | Class | Per-AY |
| StudentCategory/EntryMode | Admission type | Rare | ✓ | ✓ | ✓ | — | Extensible |
| StudentAcademicHistory | Progression timeline | Per-event | ✓ | ✓ | — | Student | Append-only |
| Hostel/HostelBlock | Residential | Rare | ✓ | ✓ | ✓ | Campus | Archive |
| Building/Room/Lab | Infra | Rare | ✓ | ✓ | ✓ | Campus | Archive |
| Gate | Entry point | Rare | — | ✓ | ✓ | Campus | Archive |
| Reader/Device | Access device | On failure | — | ✓ | ✓ | Gate | Retire→replace |
| Guardian | Consent link | Per-student | ✓ | ✓ | — | Student | History |
| FacultyAssignment | Teaching link | Per-sem | ✓ | ✓ | ✓ | Class | Time-boxed |
| Role | Capability | Extensible | ✓ | ✓ | ✓ | — | Deactivate |
| AuthorityPolicy | Who-may-do | Rare | ✓ | ✓ | ✓ | Role | Versioned |
| WorkflowDefinition | Case states | Extensible | ✓ | ✓ | ✓ | Role | Versioned |
| OpsRule | Operational number | On policy | ✓ | ✓ | ✓ | — | Supersede |
| RefCategory | Taxonomy | Migration | — | ✓ | ✓ (rows) | Domain | Extend |
| GateFieldBlueprint | Operator fields | Rare | ✓ | ✓ | ✓ | Role/Gate | Extend |
| EntityScope | Role binding | Extensible | — | ✓ | ✓ | — | Extend |
| Timetable | Class slots | Per-sem | ✓ | ✓ | ✓ | Class | Per-AY |
| AcademicCalendar | Working/holidays | Per-AY | ✓ | ✓ | ✓ | AY | Per-AY |
| ExamSchedule | Exams | Per-sem | ✓ | ✓ | ✓ | Semester | Per-AY |
| ScheduleException | Date override | On-demand | ✓ | ✓ | ✓ | Schedule | One-time |
| CampusEvent | Special day | On-demand | ✓ | ✓ | ✓ | Campus | One-time |
| VisitorApproval | Guest access | On-demand | ✓ (expiry) | ✓ | ✓ | Visitor | Expires |
| SecurityPost/Shift | Duty roster | Recurring | ✓ | ✓ | ✓ | Gate | Recurring |
| StudentPresence | Live state | Continuous | — | ✓ | — | Student | Live |
| WorkerType (ref_category) | Worker taxonomy | Extensible | — | ✓ | ✓ (rows) | Campus | Extend |
| WorkerAssignment | Worker→block/shift | Recurring | ✓ | ✓ | ✓ | WorkerType | Time-boxed |
| WorkerAttendanceLog | GPS in/out | Continuous | — | ✓ | ✓ | Worker | Append |
| CircularRequest | OCR notice→approval | On-demand | ✓ (dates) | ✓ | ✓ | Campus | One-time |
| ShiftHandoverRequest | Operator handover | On-demand | ✓ | ✓ | ✓ | Shift | One-time |
| Achievement/Activity/CampusFeed | Engagement | Continuous | — | ✓ | ✓ | Student | Append |
| Deadline/DateRule | Institutional date | Per-AY | ✓ | ✓ | ✓ | Various | Per-AY |

### A. Core stable: Institution, Campus, Institution-level Role, AuthorityPolicy
### B. Academic: AcademicYear, Semester, Regulation, Program, Branch, Batch, Section, EntryMode, StudentAcademicHistory, Class, FacultyAssignment
### C. Time-dependent: Timetable, AcademicCalendar, ExamSchedule, ScheduleException, CampusEvent, VisitorApproval, Deadline/DateRule, StudentPresence
### D. Operational: SecurityPost/Shift, OpsRule, GateFieldBlueprint, RefCategory, CampusEvent, CircularRequest, ShiftHandoverRequest, WorkerAssignment, WorkerAttendanceLog
### E. Infrastructure: Gate, Reader/Device, Building/Room/Lab, Hostel/Block, Server/Network, Sensor/Kiosk
### F. Configuration: EntityScope, Role, OpsRule, RefCategory, WorkflowDefinition, AuthorityPolicy, GateFieldBlueprint
### G. Rules/policies: AuthorityPolicy, WorkflowDefinition (transition_roles), OpsRule, ScheduleException, access policies
### H. Derived: YearOfStudy, batch label, expected/actual graduation year, "can enter now", presence state, access-expiry, dedupe
### I. Audit/history: audit_logs, pgaudit, academic_history, device replacement history, role/workflow version history
### J. Extension points: new branch/program/regulation row, new device-type, new role+policy, new ops_rule domain, new workflow, new ref_category (incl. worker_type), new circular target type, new campus / new occupant_type, new access-credential type, new worker_type row, new shift-handover rule

---

## 17. The most important output — what's treated as fixed but must be configurable/versioned

### 1. Hard-coded assumptions
- **`src/lib/rollNumber.ts`:** July-1 AY start, B.Tech=4 / M.Tech=2, "5A=lateral→year 2", college short "JJ (UCEJ)", department-from-roll. All institutional policy in code.
  - **Live proof it bites:** the dept→name map is a hard-coded literal table in that file —
    `RollDeptCode = "02"|"03"|"04"|"05"|"12"` and `"02":{short:"EEE"}, "05":{short:"CSE"},
    "58":{short:"CSE M.Tech"}`. Commit `09528f52` ("remove Civil Engineering
    department from all code paths") edited **7 source files** just to drop one
    department. That is the "institution changes → software gets rewritten"
    failure, made concrete. It should have been deleting a registry row.
  - Newest commits *extend* the hard-coding rather than removing it
    (`09515a55` M.Tech 1D specialization; `451a438b` M.Tech 1D entry + roll
    immutability). The string-decoder approach keeps accumulating code.
- **`classes.year INTEGER`:** a bare integer, not a FK to `academic_years` + batch + section.
- **`student_details.department/branch/semester/regulation/admission_date` as free-text:** no FK, no version, no effective-dates.
- **`entity_scopes` seed:** 9 departments + 4 hostel blocks baked as insert rows (fine as *seed*, but the source of truth must be the registry, not the seed).

### 2. Hidden dependencies
- Gate events depend on `gates.type` (main/hostel) for presence transitions (`update_student_presence`) — so gate *type* is a load-bearing enum, not metadata.
- `student_presence` depends on `hostel_block` (text) to resolve block.
- Roll number silently drives year, batch, entry-mode, and department across the app.

### 3. Missing entities
- `academic_years`, `semesters`, `regulations`, `programs`, `branch_registry`, `batches`, `program_durations`, `entry_modes`, `device/readers`, `timetables`, `academic_calendars`, `examination_schedules`, `deadlines/date_rules`, `hostel_allocations`.

### 4. Missing relationships
- Student→AcademicYear/Batch (FK, time-boxed), Student→Regulation (pinned),
  Class→AcademicYear, Gate→Reader, Reader→Device, Device→Location,
  Timetable→Class, FacultyAssignment→AcademicYear/semester.

### 5. Missing lifecycle states
- Branch/Program/Gate/Reader/Role/AY: no `deprecated/archived`. Only
  `users.deleted_at` (soft) and `classes.is_active` exist today.

### 6. Missing historical tracking
- No `student_academic_history`; no effective-from/to on branch/section/regulation;
  gate events don't snapshot academic state at event time.

### 7. Missing academic-year/version handling
- AY is a *convention in code* (`currentAcademicYearStart`), not an entity;
  regulation/curriculum have no version.

### 8. Missing infrastructure abstraction
- No reader/device identity key; no device health/replacement/decommission;
  no "rebind historical records on replacement."

### 9. Missing rules/configuration layer
- Academic rules (year/branch/graduation) and presence/exit rules are in code;
  they should read `ops_rules`/workflows like the gate-record automation does.

### 10. Missing extension points
- Device-type registry, access-credential-type registry, multi-campus root,
  deadline templates, schedule-exception engine.

---

## Future-Proofing Checklist (run before ANY new feature)

- [ ] **Does this add a new institutional value as a code constant?** If yes →
      it becomes a registry row / `ops_rules` / `ref_categories` row. No new
      literal.
- [ ] **Is a date involved?** Give it `effective_from`/`effective_to` (+ version
      if policy). Never a bare `timestamp` with no scope.
- [ ] **Is this academic (year/semester/batch/regulation/program/branch)?** It
      must be a *versioned entity* + a *snapshot* on any gate/event record.
      Derive; don't store mutable truth.
- [ ] **Would a branch rename / regulation change / AY rollover rewrite history?**
      If yes → add the rename/version chain now.
- [ ] **Is a device/infra referenced by identity?** Use a stable device key +
      `replaced_by`; archive, never delete.
- [ ] **New gate / reader / building / hostel / role / device-type?** Must be
      addable as a row with **zero source changes**.
- [ ] **New operational number / threshold / window?** → `ops_rules` row with
      effective window, not code.
- [ ] **New case / approval / state?** → `workflow_definitions` +
      `authority_policies` row.
- [ ] **Multi-campus / new access method / new credential type?** Confirm the
      model has a root that can hold more than one.
- [ ] **Defaults:** safe defaults only; institutional policy defaults to
      "not set → deny/require approval."
- [ ] **Lifecycle:** does the entity need `deprecated/archived` (not delete)?
- [ ] **Audit:** every academic/infra change lands in the append-only audit log.

**Central principle, made true:** the institution changes; the software does
not get rewritten. The academic core (string + bare-integer + code-baked
convention) is the one area that currently violates that principle and is the
highest-leverage fix.
