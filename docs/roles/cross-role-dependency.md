# Cross-Role Dependency Map

## Purpose
This document maps which roles are missing functions that other roles already have,
and where a role can/should borrow capabilities from another role's implementation.
Use this when implementing new features: if role X needs a function that role Y
already has, reference Y's implementation rather than building from scratch.

## Capability Sharing Matrix

### Gate & Security Operations

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| Gate scan/verify | operator | supervisor, admin | Supervisor needs read-only scan view; admin needs gate config only |
| Watchlist check | supervisor | operator, admin | Operator should auto-check watchlist on scan (currently manual) |
| Overstay alert | supervisor | admin, principal | Admin should see overstay count in dashboard; Principal should get alerts |
| Device health | operator | admin, sysadmin | Admin should see device status; sysadmin should monitor daemons |
| Batch verify | operator | admin | Admin should be able to trigger batch verify for peak hours |
| Manual entry audit | operator | admin, sysadmin | Admin should review manual entries; sysadmin should audit trail |
| Shift handover | operator, supervisor, staff | admin | Admin should see handover status across all gates |
| Lockdown control | admin, principal | supervisor, operator | Supervisor should trigger gate-level lockdown; operator should see lockdown state |
| Emergency alert | admin | supervisor, operator | Supervisor should trigger emergency; operator should see alert |
| Campus occupancy | admin | supervisor, principal, staff | Supervisor needs occupancy for gate decisions; staff needs it for shifts |

### Academic Operations

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| Marks entry | faculty | hod, exam_branch | HOD should review/verify marks; exam_branch should aggregate |
| Class confirm | faculty, hod, vp | principal | Principal should see confirmation status but not confirm |
| Assignment view | student, faculty | hod, dean | HOD should see assignment completion rate; Dean should see KPI |
| Mentee list | faculty | hod | HOD should see mentee load per faculty |
| Live class view | faculty, hod, vp, principal | dean | Dean should see live class state for academic oversight |
| Exam coordination | vp | exam_branch, oie | Exam branch should see VP's exam coordination; OIE should triage |
| Internal exam propose | hod | vp, principal | VP should review HOD's exam proposals; Principal should approve |
| Academic status flag | hod | dean, principal, vp | Dean/Principal should see pending flags; VP should see department-level |
| DEBARRED escalation | principal (chief_warden) | dean | Dean should see DEBARRED case files for review |
| Board of Studies | hod, dean | vp, principal | VP should see BoS minutes; Principal should approve |

### Hostel Operations

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| Room allot/vacate | hostel_manager | deputy_warden, caretaker | Deputy Warden should see room status; Caretaker should see occupancy |
| Curfew verify | deputy_warden | hostel_manager, vp | Hostel Manager should see curfew compliance; VP should see aggregate |
| Night attendance | deputy_warden | hostel_manager, chief_warden | Hostel Manager should reconcile; Chief Warden should audit |
| Incident log | deputy_warden, hostel_manager | caretaker, emo | Caretaker should see incidents affecting their block; EMO should see infrastructure incidents |
| Visitor log | deputy_warden | visitor, supervisor | Visitor should see their own visit history; Supervisor should see all |
| Mess menu | mess_incharge | hostel_manager, student | Hostel Manager should see menu for oversight; Student should see menu |
| Mess token | mess_incharge, student | hostel_manager | Hostel Manager should see token consumption for reconciliation |
| Mess bill | mess_incharge | admin, hostel_manager | Admin should see bill status; Hostel Manager should verify |
| Grievance tracking | caretaker, deputy_warden | emo, admin | EMO should see infrastructure grievances; Admin should see all |
| DEBARRED | principal (chief_warden) | dean | Dean should see DEBARRED cases for academic review |
| Hostel occupancy | hostel_manager | vp, principal, admin | VP should see aggregate; Principal should see KPI; Admin should see real-time |

### Exam Operations

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| Candidate attendance | exam_superintendent | oie, exam_branch | OIE should reconcile; exam_branch should aggregate |
| Hall access | exam_superintendent | oie | OIE should triage hall access requests |
| Spot exceptions | exam_superintendent | vp, principal | VP should see exceptions; Principal should approve major ones |
| Exam queue | oie | vp, exam_superintendent | VP should triage; Chief Sup should see exam-day queue |
| Hall ticket gen | exam_branch | admin | Admin should track distribution status |
| Result processing | exam_branch | principal, vp | Principal should sign off; VP should see status |
| Result publishing | exam_branch | admin | Admin should trigger publishing |
| Discrepancy detect | exam_branch | oie, vp | OIE should triage discrepancies; VP should review |
| Observer allotment | exam_branch | principal | Principal should approve observer assignments |
| Center jumbling | exam_branch | principal | Principal should approve jumbling |

### Infrastructure & Maintenance

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| Maintenance tickets | worker, staff | emo, hostel_manager, caretaker | EMO should triage; Hostel Manager should see hostel tickets; Caretaker should see block tickets |
| Vendor SLA | emo | admin, principal | Admin should see vendor compliance; Principal should approve major contracts |
| Estate asset register | emo | admin, sysadmin | Admin should see asset inventory; sysadmin should see tech assets |
| Campus infra map | emo | admin, principal | Admin should see infrastructure status; Principal should see KPI |
| Complaint triage | emo | admin, supervisor | Admin should triage non-infra; Supervisor should triage security |
| Repair cosign | emo, principal | admin | Admin should see repair status |

### Administrative & Governance

| Capability | Currently in | Missing from | How to share |
|-----------|-------------|-------------|-------------|
| User provisioning | admin | principal | Principal should see user stats; Admin handles provisioning |
| Gate config | admin | sysadmin | Sysadmin should see gate config for infra changes |
| Audit export | admin | sysadmin | Sysadmin should see full audit with UUIDs |
| Role delegation | admin, principal | vp, dean | VP should see delegation chain; Dean should see academic delegations |
| MFA policy | sysadmin | admin | Admin should see MFA status but not manage |
| Backup/restore | sysadmin | principal | Principal should approve restore operations |
| RLS audit | sysadmin | admin | Admin should see RLS drift score |
| Deployment | sysadmin | admin | Admin should see deployment status |
| Break-glass | sysadmin | principal | Principal should approve break-glass |
| Compliance reports | admin | dean, principal | Dean should see AICTE/NBA compliance; Principal should see all |
| SMS queue | admin | sysadmin | Sysadmin should see SMS dispatch for debugging |
| Alert broadcast | admin | principal, vp | Principal should approve major alerts; VP should see alert status |

## Cross-Role Actions (one role acting in another's context)

### Principal wearing three hats
- **Principal** — full campus authority, all approver workflows
- **Chief Warden** — hostel disciplinary escalation to DEBARRED (separate audit context: role_context='chief_warden')
- **Chief Superintendent** — exam-day command, candidate attendance, hall access (separate audit context: role_context='exam_superintendent')

### Vice-Principal discharging Principal's duties
- When Principal is on leave, VP gets delegated authority with time-box
- VP can: sign approvals, trigger lockdown (with two-person), view all Principal dashboards
- VP cannot: escalate to DEBARRED (Principal/Chief Warden only), sign exam results (Controller only)

### HOD + Dean two-person rule (DEBARRED)
- HOD flags a student as DEBARRED → parks in pending_approvals
- Dean (or Principal) must approve → DEBARRED becomes active
- Both HOD and Dean actions are logged in audit_events

### Admin + Principal two-person rule (Lockdown)
- Admin triggers lockdown → requires Principal approval
- Both actions logged; lockdown auto-revokes after time-box

### SysAdmin + Principal two-person rule (Break-glass)
- SysAdmin triggers break-glass → requires Principal approval
- Time-boxed to 30 minutes; auto-revokes; both actions logged

### Faculty + HOD (Marks entry → review)
- Faculty enters marks → HOD reviews/verifies
- HOD cannot self-approve their own faculty's marks (SoD)
- Exam branch office aggregates and processes results

### Mess In-charge + Hostel Manager (Menu → oversight)
- Mess In-charge finalizes menu with Mess Committee
- Hostel Manager reviews menu for hostel blocks
- Both logged in audit_events

## Roles That Should See Another Role's Data (read-only)

| Viewer | Data | Owner | Rationale |
|--------|------|-------|-----------|
| supervisor | gate scan log | operator | Escalate exceptions, verify operator actions |
| admin | operator stats | operator | Operational analytics |
| admin | device health | operator | Gate hardware monitoring |
| principal | all gate events | operator/supervisor | Strategic oversight |
| principal | all user activity | admin | Campus governance |
| vp | principal dashboard | principal | Delegation support |
| vp | exam coordination | exam_branch | Exam oversight |
| vp | hostel aggregate | hostel_manager | Hostel oversight (no PII) |
| dean | academic KPIs | hod | Cross-department review |
| dean | DEBARRED cases | principal | Academic governance |
| emo | infrastructure complaints | admin, staff | Estate oversight |
| emo | vendor SLA data | admin | Vendor compliance |
| student | mess menu | mess_incharge | What's being served |
| student | curfew status | deputy_warden | Compliance |
| parent | child attendance | faculty | Academic progress |
| parent | child fee status | admin | Financial oversight |
| guardian | child gate passes | student | Safety |
| visitor | host info | student/faculty/staff | Verification |
| worker | assigned tasks | emo, hostel_manager, admin | Job management |
| staff | gate status | operator | Shift awareness |
| staff | occupancy | admin | Shift planning |
| exam_branch | candidate data | exam_superintendent | Result processing |
| oie | exam queue | exam_superintendent | Triage support |
| caretaker | block incidents | deputy_warden | Maintenance awareness |

## Implementation Notes

1. **Read-only views**: When a role needs another role's data, use scoped API routes with `requiredRole` checks. The viewer role gets read-only access; the owner role gets write access.

2. **Capability borrowing**: If role X needs a capability that role Y already has, add a `when` condition to X's capability list that checks for the relevant context. Example: supervisor should have `operator.scan.view` capability for read-only scan log access.

3. **Two-person rules**: All two-person approvals (lockdown, break-glass, DEBARRED) should create a `pending_approvals` record that tracks both approvers. The second approver's action activates the record.

4. **Role context**: When a role wears multiple hats (Principal = Chief Warden = Chief Superintendent), use `role_context` in audit_events to distinguish which hat was worn.

5. **SoD enforcement**: No role can both create and approve. Faculty enters marks, HOD reviews, exam_branch processes, Controller signs off. Each step is a separate role action logged in audit_events.

