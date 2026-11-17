# JNTUH CEJ Role Hierarchy — Entity-Aligned Operational Model

This document re-casts the generic role model (see ROLE_OPERATIONS.md) around
JNTUH CEJ's actual administrative entities: the five B.Tech departments, the
hostel block system, the examination branch, and the committees that govern
them. Tier controls (APPROVER → OPERATOR → ADMIN → SYSADMIN) are preserved;
each role is bound to the entity that owns the work.

## Institutional entity map

JNTUH CEJ (Constituent College, JNTU Hyderabad) — 5 B.Tech departments
(EEE, ME, ECE, CSE, IT) + 5 M.Tech specializations.

| Entity | Owner | Notes |
|---|---|---|
| Principal | Administrative & academic head | Also Chief Warden (hostels) and Chief Superintendent (exams) by JNTUH convention |
| Vice-Principal | Reports to Principal | Deputy authority during leave/vacancy |
| Deputy/Assistant Registrar | Administrative officers | Support role |
| HOD × 5 (+science/HSS HODs) | EEE, ME, ECE, CSE, IT; Physics, Chemistry, Math, English | Department-scoped |
| Officers-in-Charge | Maintenance (Electrical), NSS, CRC, Student Affairs | Faculty with additional duties |
| Hostel blocks × 4 | 2 boys + 2 girls | Each with a Deputy Warden |
| Mess Committee | Constituted by Principal | Review body, not a system role |
| Examination Branch | Controller + Additional Controllers | Split desks, see Tier 2 |

## Tier 1 — Institution head & deputies (APPROVER / OPERATOR)

| Role key | JNTUH CEJ entity | Operations |
|---|---|---|
| `principal` | Principal | Full campus dashboard; approves all approver workflows; Chief Warden of hostels; constitutes Mess Committee; lockdown authority; delegates VP/HOD duties |
| `vice_principal` | Vice-Principal | Exam office queue; OIE duties; academic exceptions; discharges Principal's duties during leave; department-level academic review |
| `hod` | HOD of EEE/ME/ECE/CSE/IT + science HODs | Department roster (scoped to `auth.departmentId`); class management; academic status flags (SUSPENDED/DEBARRED/LATERAL_JOIN) in own dept only; faculty workload; grievance escalation; internal exam proposal to exam branch |
| `dean` (NEW) | Associate Dean (Academics) / Associate Dean (Student Affairs) | Academic Dean: NBA/NAAC coordination, curriculum files, inter-departmental academic correspondence. Student Affairs Dean: student welfare, hostel-student interface, discipline oversight |

**Control:** DEBARRED status requires HOD + Dean/Principal two-person approval
(blocks exam eligibility and gate access). Time-bound delegation object
`(delegator, delegatee, scope, expires_at)` lets Vice-Principal act for
Principal without permanent role change.

## Tier 2 — Examination branch (APPROVER / OPERATOR) — split desks

| Role key | JNTUH CEJ desk | Operations |
|---|---|---|
| `controller_examinations` | Controller of Examinations | Overall exam conduct; result processing sign-off; policy decisions; approves exceptions escalated by Addl. Controllers |
| `addl_controller_academic` | Additional Controller (Academic) | Admission verification; clearance certificates; malpractice punishment verification; legal/RTI exam matters; certificate genuineness; late mark correction routing |
| `addl_controller_results` | Additional Controller (Result Processing) | Scanning bar-coded marks; result processing; marks memos, PC, CMM, degree printing — **cannot modify marks**, only process |
| `addl_controller_automation` | Additional Controller (Automation) | Student profile upload; attendance upload; CBT; internal marks finalization; hall tickets; center jumbling; seating/nominal rolls; D-forms; encrypted question paper distribution |
| `exam_superintendent` | Chief Superintendent (Principal acts) | Exam-day console; candidate attendance; hall access; spot exceptions |
| `oie` | OIE / exam office | Exam queue triage; access & exception intake; candidate attendance reconciliation |

**Control:** Marks entry (faculty) ≠ result processing (Addl. Ctrl Results)
≠ result sign-off (Controller). No single exam role can both enter and
publish a result. Late corrections route through Addl. Controller (Academic)
with audit reason.

## Tier 3 — Hostel & mess (APPROVER / OPERATOR)

| Role key | JNTUH CEJ entity | Operations |
|---|---|---|
| `chief_warden` (= Principal) | Chief Warden is the Principal — one person, not a separate account. `chief_warden` is a **role context**: when the Principal acts on hostel matters, the audit trail logs `role_context='chief_warden'` so hostel actions are auditable separately from general principal actions. No distinct user carries this role; the `principal` user already holds warden authority. | Overall hostel administration; approves hostel committee decisions; final hostel discipline authority; hostel budget oversight; decisions logged under the chief_warden role context |
| `hostel_manager` | Hostel Manager (teaching faculty in-charge, one per college/unit) | Room allotment; day-to-day mess facilities; supervises Deputy Wardens; hostel inventory; block-level occupancy |
| `deputy_warden` | Deputy Warden (one per hostel block — 2 boys + 2 girls) | Block-level curfew verification; night attendance reconciliation; room vacate/allot within block; incident log; visitor log for that block; mess rule violation reporting |
| `mess_incharge` | Warden (Mess) / Mess Committee operational lead | Menu finalization with Mess Committee; token issuance; consumption vs inventory reconciliation; vendor/contractor compliance; mess bill verification; rebate ledger |

**Control:** Mess Committee is a review body, not a system role. Menu changes
above a cost/calorie threshold require Mess Committee approval (recorded in
system). Deputy Warden logs discipline incidents; only Chief Warden escalates
to DEBARRED status.

## Tier 4 — Gate & security (OPERATOR / APPROVER)

| Role key | JNTUH CEJ entity | Operations |
|---|---|---|
| `operator` | Gate desk operator | Scan, lookup, manual entry, transactions, shift handover; device health report; batch pass verification at peak |
| `supervisor` | Security supervisor | Escalated gate exceptions; visitor overstay alerts; watchlist management; shift handover with open items; all gate live view |

**Control — hostel leave gate chain:** A student's gate pass is valid only
when the Deputy Warden has approved the hostel leave AND the parent has
acknowledged it. A `gate/verify-leave-chain` check runs before any manual
override; if any link is missing the gate flag is PENDING, and manual
override requires Supervisor + audit reason.

## Tier 5 — Faculty & staff (APPROVER / APP)

| Role key | Operations (beyond current) |
|---|---|
| `faculty` | Marks entry (internal + external submission, not result processing); assignment creation/grading; study material upload; mentee list (scoped); class analytics; internal exam proposal to HOD/exam branch; leave/substitution request |
| `staff` | Shifts, handover, gate status, occupancy, maintenance ticket assignment; exam support duties as assigned by exam branch |
| `caretaker` | Maintenance queue for specific blocks; housekeeping task closure; asset verification against hostel inventory |

**Control:** Faculty marks entry is locked after the exam branch deadline.
Late corrections route through Addl. Controller (Academic) with audit reason.

## Tier 6 — Students, parents, guardians, visitors

| Role key | Customization |
|---|---|
| `student` | Fee dues/receipts, library account, marks/grade-card view, scholarship status, conduct record view. Shake-to-report stays. Bot: `/fees` `/library` `/marks` |
| `parent` | Child's fee dues/payment, academic progress (marks + attendance %), leave request on behalf of child. Parent acknowledgement is a required step in the gate-pass chain for hostel students |
| `guardian` | Ward's curfew compliance; re-verification of guardian link (self-service with OTP/biometric anchor); complaint filing |
| `visitor` | Pass lifecycle; check-in/out; overstay auto-flag if not checked out within threshold |

## Hierarchy controls (enforced separation of duties)

1. **HOD scope lock extended** — covers science/HSS HODs (Physics,
   Chemistry, Mathematics, English). An HOD of EEE never sees CSE student
   data.
2. **Exam branch separation** — marks entry (faculty) ≠ result processing
   (Addl. Ctrl Results) ≠ result sign-off (Controller). No single role can
   both enter and publish a result.
3. **Hostel leave gate chain** — student gate pass → Deputy Warden approval
   → parent acknowledgement → gate operator scan. Missing link = PENDING;
   override = Supervisor + audit reason.
4. **Mess Committee review gate** — mess_incharge changes a menu item, but a
   change above the defined cost/calorie threshold requires Mess Committee
   approval, recorded in the system.
5. **Chief Warden = Principal (one person, role context only)** — when the
   Principal acts on hostel matters, the audit trail logs
   `role_context='chief_warden'` so hostel actions are auditable
   separately from general principal actions. No distinct warden
   account exists or should be created.
6. **Two-person rule for DEBARRED and SUSPENDED** — HOD flags → Dean
   (Academics) or Principal approves. A single HOD cannot debar
   unilaterally.
7. **Time-bound delegation across all approver roles** — Vice-Principal
   acting for Principal; senior faculty acting for HOD during leave; Addl.
   Controller acting for Controller during absence. Delegation object expires
   automatically.

## Entity-priority sequence (what to build first)

1. **Split the exam branch role** into `controller_examinations`,
   `addl_controller_academic`, `addl_controller_results`,
   `addl_controller_automation`. Biggest operational gap: JNTUH CEJ's
   autonomous status means it runs its own exams, and a single role cannot
   enforce separation of duties.
2. **Re-cast hostel roles** as `chief_warden` / `hostel_manager` /
   `deputy_warden` (block-scoped) and wire the gate–hostel–parent leave
   chain.
3. **Add the `dean` role** (Academics + Student Affairs) — NBA/NAAC
   coordination and student welfare are already organizational realities.
4. **Add faculty marks-entry + lock and exam-branch result processing** as
   separate operations.
5. **Add parent fee/marks/leave and student fee/library/marks** so the
   student lifecycle is complete.

The current ROLE_OPERATIONS.md is a permission map. This document turns it
into an entity-aligned operational model matching how JNTUH CEJ actually
governs its departments, hostels, mess, and examination branch — without
weakening the tier controls.

## Implementation status (live as of commit 7094367c)

The entity model above is now wired into the running system:

| Control from this doc | Shipped | Where |
|---|---|---|
| 6 new entity roles | ✅ | `users.role` CHECK + `config_roles_registry` (migration 20270114); `src/lib/roles.ts` has 29 roles |
| exam_branch split | ✅ | the lone `exam_branch` user re-pointed to `addl_controller_academic`; 3 desk shell accounts created (DISABLED, ready to credential) |
| Two-person DEBARRED/SUSPENDED | ✅ | HOD write parks in `status_pending_approver`; `/api/academic-status/pending` queue (GET/POST) for dean/principal/VP/chief_warden/admin/sysadmin; DB backstop trigger parks any direct-SQL write from a non-approver |
| Hostel leave gate chain | ✅ | `leave_requests` state machine (migration 20270115) + `/api/parent/leave/acknowledge` + `/api/gate/verify-leave-chain` (returns exactly which link is missing) + `/api/cron/leave-chain` agent (TTL reminders, escalation, auto-expiry, gate-token issuance) |
| Chief Warden escalation | ✅ | `/api/hostel-manager/incidents/[id]/escalate` — only `chief_warden`/`principal`; writes the academic two-person flow |
| HOD scope incl. science HODs | ✅ | `/api/hod/exam-review` and academic-status GET/POST are `auth.departmentId`-locked; `entity_scopes` seeds all 9 departments (5 B.Tech + Physics/Chem/Math/English) |
| Marks entry ≠ processing ≠ sign-off | ✅ | `/api/faculty/marks` (faculty DRAFT) → `/marks/submit` (LOCK) → `/api/exam/results/process` (addl_controller_results) → `/api/exam/results/publish` (controller_examinations only); corrections only via `/api/faculty/marks/correct` (academic desk, maker ≠ checker) |
| Time-bound delegation | ✅ | `delegations` table (TTL + can_mutate + no-self-delegation) + `/api/admin/roles/delegate` + delegation-aware `withAuthorization` fallback + `/api/delegations/graph` (machine-readable authority graph) |
| Mess Committee review gate | ⚠️ Partial | `mess_incharge` operations live (reconcile/anomaly/bills); the cost-threshold approval row still needs the menu-change hook |
| chief_warden audit context | ✅ | hostel decisions write `audit_events` with `role_context='chief_warden'`, separate from principal actions |

**Tier 6 completions (shipped):** student fee dues/receipts, library
issues+fines, published-only grade card, scholarship status — and the
`/fees` `/library` `/marks` bot commands. Parent: fee view, leave
acknowledgement (the gate-chain link), guardian re-verification.

Still planned (next build): HOD faculty-workload/grievance endpoints,
parent fee payment gateway hook, and the Mess Committee threshold hook.
