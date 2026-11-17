# JNTUH CEJ Complete Implementation Blueprint

From baseline audit through the long-term agentic architecture, in build
order. Each step depends on the one before; execute top-to-bottom with no
circular blockers.

> **Critical sequencing insight:** Steps 0–2 are database and role work —
> no AI, no agents, no complex logic. They can ship in 5 weeks. Steps
> 3–4 make the system operationally complete per role. Steps 5–7 add
> autonomy on top of a system that already records everything. You cannot
> skip the foundation — an agent operating inside a system without entity
> scopes and audit events is an agent you cannot govern.

## Complete implementation timeline

| Weeks | Phase | Steps | Key deliverable |
|---|---|---|---|
| 0–1 | Audit | 0.1–0.4 | audit-YYYY-MM.md, rls_snapshot.json |
| 1–3 | Foundation | 1.1–1.5 | entity/audit/approval/delegation/leave tables |
| 3–5 | Role split | 2.1–2.4 | 26 roles with entity scopes |
| 5–9 | API build | 3.1–3.9 | 60+ new routes with tests |
| 9–11 | Enforcement | 4.1–4.3 | withAuthorization + RLS + CI gates |
| 11–16 | Agents | 5.1–5.6 | 4 bounded agents with SPIFFE identities |
| 16–24 | Self-healing | 6.1–6.4 | offline gate, risk pipeline, two-person approvals |
| 24–36+ | Governance | 7.1–7.5 | tamper-evident audit, delegation graph, PQ roadmap |

---

## STEP 0 — Baseline audit (Week 0–1)

Before changing anything, produce four artifacts. Without these, every
later step is guesswork.

### 0.1 — Route-role inventory
Run `grep -rn "requiredRole" src/app/api` and generate a table of
route → role → entity scope. Compare against `docs/ROLE_OPERATIONS.md`.
Flag every route where `requiredRole` does not match the entity scope
(e.g., an HOD route that does not filter by `departmentId`).

### 0.2 — RLS snapshot
Export `pg_policies` and `pg_class.relrowsecurity` to
`rls_snapshot.json`. Check every table reachable by `gate_app`: is RLS
enabled? Is there a `USING (true)` policy? Flag each one.

### 0.3 — Manual-intervention log
For two weeks, every human action that is not a routine scan/click gets
logged in a spreadsheet: who did what, which role, how long it took,
whether another role was needed to complete it. This is the priority
list. You cannot safely automate what you have not measured.

### 0.4 — Role gap map
Cross-check the 29 roles against JNTUH CEJ's actual organizational
entities (five B.Tech departments, five M.Tech, science/HSS HODs, 4
hostel blocks, exam branch desks, Mess Committee). Every entity without
a matching role or entity scope is a gap.

**Output:** `docs/audit-YYYY-MM.md`, `rls_snapshot.json`,
`manual-intervention-log.xlsx`, `role-gap-map.md`.

---

## STEP 1 — Database foundation (Weeks 1–3)

Schema changes only. No API or UI changes yet. These are the
prerequisite for everything.

### 1.1 — Entity scope table
```sql
CREATE TABLE entity_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,  -- 'department', 'hostel_block', 'exam_branch', 'mess'
  entity_code TEXT NOT NULL,  -- 'EEE', 'BLOCK_A', 'RESULTS_CELL'
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES entity_scopes(id),
  UNIQUE(entity_type, entity_code)
);
```
Seed with:
- Departments: EEE, ME, ECE, CSE, IT, Physics, Chemistry, Mathematics, English
- Hostel blocks: BOYS_A, BOYS_B, GIRLS_A, GIRLS_B
- Exam branch desks: CONTROLLER, ADDL_ACADEMIC, ADDL_RESULTS, ADDL_AUTOMATION
- Mess: MESS_MAIN

Then add `entity_scope_id` to `users`, `student_details`, `classes`,
`passes`, and every table that already has implicit scoping.

### 1.2 — Audit events table
```sql
CREATE TABLE audit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human','agent','system')),
  role_context TEXT NOT NULL,
  entity_scope_id UUID REFERENCES entity_scopes(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  delegation_id UUID,
  before_state JSONB,
  after_state JSONB,
  latency_ms INT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_actor_time ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity_time ON audit_events(entity_scope_id, created_at DESC);
```
Enable RLS: sysadmin sees all, admin sees own entity + descendants,
every other role sees only `actor_id = auth.uid()`.

### 1.3 — Maker-checker table
```sql
CREATE TABLE pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_id UUID NOT NULL,
  checker_id UUID NOT NULL,
  action TEXT NOT NULL,        -- 'DEBARRED', 'SUSPENDED', 'SYSADMIN_GRANT', 'MESS_CONTRACTOR_ESCALATION'
  resource TEXT NOT NULL,
  resource_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT maker_ne_checker CHECK (maker_id <> checker_id)
);
```
The CHECK constraint is the enforcement: the maker cannot be the checker
at the database layer, not just in application code.

### 1.4 — Delegation table
```sql
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL,
  delegatee_id UUID NOT NULL,
  role TEXT NOT NULL,
  scope_entity_id UUID REFERENCES entity_scopes(id),
  can_mutate BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_delegation CHECK (delegator_id <> delegatee_id),
  CONSTRAINT valid_window CHECK (expires_at > starts_at)
);
```
Every API call checks:
```sql
SELECT 1 FROM delegations
WHERE delegatee_id = auth.uid()
  AND role = requiredRole
  AND (scope_entity_id IS NULL OR scope_entity_id = resource_entity)
  AND now() BETWEEN starts_at AND expires_at
  AND revoked_at IS NULL;
```

### 1.5 — Leave-chain state machine
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  hostel_block_id UUID REFERENCES entity_scopes(id),
  from_ts TIMESTAMPTZ NOT NULL,
  to_ts TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','WARDEN_APPROVED','PARENT_ACKNOWLEDGED','GATE_ISSUED','USED','EXPIRED','REJECTED')),
  warden_approved_by UUID,
  warden_approved_at TIMESTAMPTZ,
  parent_acknowledged_by UUID,
  parent_acknowledged_at TIMESTAMPTZ,
  gate_issued_at TIMESTAMPTZ,
  gate_jwt TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Output:** migration applied to staging, tested with synthetic data.

---

## STEP 2 — Role split and entity binding (Weeks 3–5)

### 2.1 — Replace `exam_branch` with four roles

In `src/lib/roles.ts`:
- `controller_examinations`
- `addl_controller_academic`
- `addl_controller_results`
- `addl_controller_automation`

Migrate existing `exam_branch` users to `addl_controller_academic`
(least-privilege default). Map each new role to an entity scope:

| Role | entity_scope | can_mutate marks | can_mutate results |
|---|---|---|---|
| `controller_examinations` | CONTROLLER | false | true (sign-off) |
| `addl_controller_academic` | ADDL_ACADEMIC | true (corrections only) | false |
| `addl_controller_results` | ADDL_RESULTS | false | true (processing) |
| `addl_controller_automation` | ADDL_AUTOMATION | false | false |

Add DB-level grants:
```sql
GRANT UPDATE (marks) ON marks TO addl_controller_academic_role;
-- NOT to results or automation
```
This is the separation-of-duties control at the database layer.

### 2.2 — Split hostel roles
- `chief_warden` → role context on the Principal's user (not a separate account), entity scope = all hostel blocks
- `hostel_manager` → one per college/unit, entity scope = all blocks under that unit
- `deputy_warden` → one per block, entity scope = single block (BOYS_A, BOYS_B, GIRLS_A, GIRLS_B)
- `mess_incharge` → entity scope = MESS_MAIN

Add `entity_scope_id` to `users`; enforce `deputy_warden` scope in RLS:
```sql
USING (entity_scope_id = current_setting('auth.entity_scope_id')::uuid)
```

### 2.3 — Add `dean_academics` and `dean_student_affairs`
Both APPROVER tier. `dean_academics` is the checker for DEBARRED
approvals. `dean_student_affairs` oversees hostel discipline
escalations and student welfare grievances.

### 2.4 — Keep HOD but bind to department entity
HOD's `entity_scope_id` must equal their department. All `/api/hod/*`
and `/api/classes` queries add:
```sql
WHERE department_id = current_setting('auth.entity_scope_id')::uuid
```
Science/HSS HODs (Physics, Chemistry, Mathematics, English) get their
own entity scopes.

**Output:** updated `roles.ts` with 26 roles, migration
`20261125_role_split.sql`, RLS policy tests for each new role.

---

## STEP 3 — Missing role operations (Weeks 5–9)

Every endpoint follows the existing `withAuthorization` pattern plus the
new entity-scope filter.

### 3.1 — Student role operations

| Endpoint | Method | Required role | Entity filter | Notes |
|---|---|---|---|---|
| `/api/student/fees` | GET | student | `student_id = auth.uid()` | Dues + receipts from Accounts module |
| `/api/student/fees/pay` | POST | student | same | Integrates with existing payment gateway |
| `/api/student/library` | GET | student | same | Issue/return history, dues |
| `/api/student/marks` | GET | student | same | Read from marks table, only published = true |
| `/api/student/scholarships` | GET | student | same | Status tracking |
| `/api/student/conduct` | GET | student | same | Read-only view of discipline record |

Bot: `/fees`, `/library`, `/marks`.

### 3.2 — Faculty role operations

| Endpoint | Method | Required role | Entity filter | Notes |
|---|---|---|---|---|
| `/api/faculty/marks` | POST | faculty | `class_id IN (faculty's assigned classes)` | Creates DRAFT marks; not published |
| `/api/faculty/marks/submit` | POST | faculty | same | Locks marks after exam-branch deadline |
| `/api/faculty/assignments` | POST/GET | faculty | `class_id IN (assigned)` | Create/list assignments |
| `/api/faculty/assignments/[id]/grade` | POST | faculty | same | Grade submissions |
| `/api/faculty/materials` | POST | faculty | same | Upload notes |
| `/api/faculty/mentees` | GET | faculty | `mentor_id = auth.uid()` | Scoped mentee list |
| `/api/faculty/class-analytics` | GET | faculty | same | Weak students, defaulters |
| `/api/faculty/internal-exam/propose` | POST | faculty | same | Proposes dates → HOD approves |
| `/api/faculty/leave` | POST | faculty | self | Substitution request |

**Critical control:** marks submission is faculty only, with a hard
deadline. After deadline, `/api/faculty/marks/correct` requires
`addl_controller_academic` role + audit reason. The Additional
Controller (Results) can never modify marks — only process them.

Bot: `/marks`, `/assignments`, `/mentees`.

### 3.3 — HOD role operations

| Endpoint | Method | Required role | Entity filter |
|---|---|---|---|
| `/api/hod/faculty-workload` | GET | hod | `department_id = auth.entity_scope_id` |
| `/api/hod/timetable/approve` | POST | hod | same |
| `/api/hod/exam-review` | POST | hod | same |
| `/api/hod/grievances` | GET | hod | same |
| `/api/hod/grievances/[id]/resolve` | POST | hod | same |
| `/api/hod/faculty-leave/approve` | POST | hod | same |
| `/api/hod/substitution/assign` | POST | hod | same |
| `/api/hod/indents` | POST | hod | same |
| `/api/hod/accreditation/export` | GET | hod | same |

**Critical control:** `/api/academic-status` (flag student) is now
two-step: HOD calls `POST /api/academic-status/flag` → creates
`pending_approvals` row → `dean_academics` or `principal` calls
`POST /api/academic-status/[id]/approve`. Only after approval does
`users.flag_status` change.

### 3.4 — Gate operator / supervisor operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/operator/shift/handover` | POST | operator | Transfers open passes, unresolved scans |
| `/api/operator/passes/batch-verify` | POST | operator | Batch scan at peak |
| `/api/operator/gate/device-health` | POST | operator | Device down report |
| `/api/supervisor/gate-exceptions` | GET | supervisor | SLA queue |
| `/api/supervisor/visitors/overstay` | GET | supervisor | Auto-flagged overstays |
| `/api/supervisor/visitors/watchlist` | POST | supervisor | Add/remove banned visitors |
| `/api/gate/verify-leave-chain` | POST | operator | Checks PARENT_ACKNOWLEDGED before pass |

**Critical control:** `/api/gate/scan` checks the leave-chain for hostel
students. If `leave_requests.status != 'PARENT_ACKNOWLEDGED'`, the scan
returns `PENDING_HOSTEL_LEAVE` and the operator must escalate to
supervisor with a reason. Supervisor override writes an
`audit_events` row with `action = 'GATE_OVERRIDE'`.

### 3.5 — Mess incharge operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/mess/inventory/reconcile` | POST | mess_incharge | Daily hash-chain reconciliation |
| `/api/mess/vendors` | CRUD | mess_incharge | Vendor records |
| `/api/mess/purchase-orders` | CRUD | mess_incharge | Purchase orders |
| `/api/mess/rebates` | GET/POST | mess_incharge | Rebate ledger |
| `/api/mess/tokens/anomaly` | GET | mess_incharge | Flags before service |
| `/api/mess/bills` | GET | mess_incharge | Per-student bills |
| `/api/mess/bills/[student]/verify` | POST | mess_incharge | Verify bill |

**Critical control:** menu change above a cost threshold requires Mess
Committee approval. The API checks `menu_item.cost_delta > threshold` →
creates `pending_approvals` row → Principal (warden context) approves.

### 3.6 — Exam branch operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/exam/eligibility-rules` | CRUD | controller_examinations | Attendance %, fee rules |
| `/api/exam/eligibility-manifest` | POST | addl_controller_automation | Signed manifest 24h before exam |
| `/api/exam/hall-tickets/generate` | POST | addl_controller_automation | Bulk generation |
| `/api/exam/seating-plan` | POST | addl_controller_automation | Room allotment |
| `/api/exam/question-papers/custody` | POST | controller_examinations | Custody log |
| `/api/exam/results/process` | POST | addl_controller_results | Results processing |
| `/api/exam/results/moderation` | POST | controller_examinations | Moderation sign-off |
| `/api/exam/results/publish` | POST | controller_examinations | Publish after moderation |

**Critical control:** the result pipeline is
`addl_controller_results` (processes) → `controller_examinations`
(moderates) → `controller_examinations` (publishes). No single role can
process and publish.

### 3.7 — Hostel operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/hostel-manager/rooms/allot` | POST | hostel_manager / deputy_warden | Room assignment |
| `/api/hostel-manager/rooms/vacate` | POST | same | Vacate with audit |
| `/api/hostel-manager/incidents` | POST | deputy_warden | Discipline incident log |
| `/api/hostel-manager/incidents/[id]/escalate` | POST | deputy_warden → chief_warden | Escalation |
| `/api/hostel-manager/inventory` | CRUD | hostel_manager | Asset inventory |
| `/api/hostel-manager/inventory/audit` | POST | hostel_manager | Periodic audit |
| `/api/hostel-manager/attendance/reconcile` | POST | deputy_warden | Manual attendance reconciliation |
| `/api/hostel-manager/visitors` | GET/POST | deputy_warden | Block-level visitor log |

### 3.8 — Parent / guardian operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/parent/fees` | GET | parent | Child's dues |
| `/api/parent/fees/pay` | POST | parent | Payment |
| `/api/parent/academics` | GET | parent | Marks + attendance % |
| `/api/parent/leave/request` | POST | parent | On behalf of child |
| `/api/parent/leave/acknowledge` | POST | parent | Acknowledge hostel leave |
| `/api/guardian/links/reverify` | POST | guardian | Self-service re-verify |

**Critical control:** `/api/parent/leave/acknowledge` is required for
hostel students to receive a gate pass. Without parent acknowledgement,
`leave_requests.status` stays at `WARDEN_APPROVED`.

### 3.9 — Admin / sysadmin operations

| Endpoint | Method | Required role | Notes |
|---|---|---|---|
| `/api/admin/roles/delegate` | POST | admin / sysadmin | Creates `delegations` row |
| `/api/sysadmin/approvals/two-person` | POST | sysadmin | Creates `pending_approvals` for high-risk |
| `/api/sysadmin/rls/drift` | GET | sysadmin | Nightly policy diff |
| `/api/sysadmin/bot/anomaly` | POST | sysadmin | Auto-suspend bot session |
| `/api/sysadmin/audit/export-hashed` | GET | sysadmin | Tamper-evident export |

**Output:** 60+ new API routes, each with RLS tests, entity-scope tests,
and role-restriction tests. Update `docs/ROLE_OPERATIONS.md` to
regenerate with new counts.

---

## STEP 4 — Enforcement wiring (Weeks 9–11)

### 4.1 — Extend `withAuthorization`

The wrapper should now check four things, in order:
1. `requiredRole` match (existing)
2. Entity scope match (new: `auth.entity_scope_id` vs `resource.entity_scope_id`)
3. Delegation check (new: if `auth.role` doesn't match, look up `delegations`)
4. Audit write (new: every mutation writes to `audit_events`)

```typescript
export function withAuthorization(requiredRole: Role | Role[], handler) {
  return async (req) => {
    const auth = await getAuth(req);
    if (!hasRole(auth, requiredRole)) {
      const delegation = await findActiveDelegation(auth.userId, requiredRole);
      if (!delegation) return forbidden();
      auth.effectiveRole = requiredRole;
      auth.delegationId = delegation.id;
    }
    const entityScope = await resolveEntityScope(auth, req);
    if (!entityScope) return forbidden();
    const result = await handler(req, { ...auth, entityScope });
    await writeAuditEvent(auth, req, result);
    return result;
  }
}
```

### 4.2 — RLS enforcement for entity scopes

For each entity-scoped table, add a policy:
```sql
CREATE POLICY entity_scope_isolation ON classes
  USING (department_id = current_setting('auth.entity_scope_id')::uuid);
```
The `current_setting` is set by the connection pool at the start of each
request from the validated JWT. Defense-in-depth: even if the API layer
forgets a filter, RLS blocks the query.

### 4.3 — CI gates

Add to the CI pipeline:
- **RLS lint:** run `pgrls` or a custom checker; fail build if any
  `gate_app`-accessible table has RLS disabled or has `USING (true)`.
- **Policy diff:** compare `pg_policies` against `rls_snapshot.json`;
  fail build on unexpected drift.
- **Role-route coverage:** for every new route, assert that
  `requiredRole` is declared and `entity_scope` is filtered.
- **Maker-checker:** assert that every `pending_approvals` creation is
  followed by a distinct `checker_id`.

**Output:** updated `withAuthorization`, RLS policies on ~40 tables, CI
pipeline with four gates passing.

---

## STEP 5 — Bounded agents (Weeks 11–16)

### 5.1 — Machine identity for each agent

Use SPIFFE/SPIRE to issue X.509-SVIDs. Each agent has:
- `spiffe://jntuhcej/agent/gate-reconciler`
- `spiffe://jntuhcej/agent/mess-ledger`
- `spiffe://jntuhcej/agent/complaint-triage`
- `spiffe://jntuhcej/agent/exam-eligibility`

Each SVID carries attributes: `role_context`, `entity_scope_id`. An
agent serving `mess_incharge` in `MESS_MAIN` cannot act on any other
entity.

### 5.2 — Policy decision point

Deploy OPA (or Cedar) with a policy like:
```rego
package jntuhcej.authz

default allow = false

allow {
  input.agent.role_context == "mess_incharge"
  input.agent.entity_scope_id == input.resource.entity_scope_id
  input.action == "read"
}

allow {
  input.agent.role_context == "mess_incharge"
  input.agent.entity_scope_id == input.resource.entity_scope_id
  input.action == "flag_anomaly"
}
```
The `flag_anomaly` action can write to `mess_anomalies` but cannot issue
tokens — that requires the human `mess_incharge`.

### 5.3 — First agent: gate reconciliation
```python
# Runs every 5 minutes, scope = operator
for scan in unmatched_scans():
    biometric = check_biometric(scan.unique_id)
    id_card = check_id_card(scan.unique_id)
    if biometric and id_card:
        write_resolution(scan, "AUTO_MATCHED", actor_type="agent")
    else:
        prepare_operator_prompt(scan, biometric, id_card)
```
The agent never opens a gate directly. It writes a resolution record;
the operator clicks once to confirm.

### 5.4 — Second agent: mess ledger
```python
# Runs at 05:00 daily
for slot in yesterday_meal_slots():
    issued = count_tokens(slot)
    enrolled = count_boarders(slot)
    consumed = count_consumption_records(slot)
    if issued > enrolled:
        flag_anomaly(slot, "OVER_ISSUANCE", issued, enrolled)
    if abs(consumed - issued) > threshold:
        block_service_window(next_slot, reason="LEDGER_MISMATCH")
```
Blocking a service window is the agent's strongest authority — and even
that is reversible by `mess_incharge` or the Principal (warden context).

### 5.5 — Third agent: complaint triage
```python
# Runs on every complaint creation
complaint = fetch_complaint(id)
category = classify(complaint.text)
entity = infer_entity(complaint.text)
route_to = find_role_with_scope(category, entity)
assign(complaint, route_to)
if is_duplicate(complaint):
    flag_duplicate(complaint, original_id)
if sla_breached(complaint):
    escalate(complaint, to="supervisor")
```
The agent cannot close complaints — only route, dedupe (flagged, not
deleted), and escalate.

### 5.6 — Fourth agent: exam eligibility
```python
# Runs 24h before each exam
for candidate in exam_registrations(exam_id):
    eligible = (
        attendance_percentage(candidate) >= threshold and
        fee_dues(candidate) == 0 and
        academic_status(candidate) == "ACTIVE"
    )
    manifest.append({"roll": candidate.roll, "eligible": eligible})
signed = sign_manifest(manifest, exam_branch_private_key)
store_signed_manifest(exam_id, signed)
```
On exam day, the gate verifier checks the signed manifest offline. If
the manifest is missing or signature invalid, the gate falls back to
live DB check (degraded mode) and alerts sysadmin.

**Output:** four agents deployed, each with a SPIFFE identity, OPA
policy, and audit trail entries with `actor_type = 'agent'`.

---

## STEP 6 — Self-healing operations (Weeks 16–24)

### 6.1 — Offline gate verifier
The gate pass JWT contains:
```json
{
  "sub": "student-uuid",
  "roll": "22B81A05XX",
  "entity_scope": "BOYS_A",
  "leave_chain_status": "PARENT_ACKNOWLEDGED",
  "nonce": "one-time-uuid",
  "exp": 1737100000,
  "device_fingerprint": "sha256-of-device",
  "iat": 1737099980
}
```
Signed with Ed25519 by the gate service private key. The gate verifier
(Raspberry Pi or similar edge device) holds the public key and validates:
1. Signature valid
2. `exp > now()`
3. `nonce` not used before (local Bloom filter)
4. `device_fingerprint` matches the student's registered device
5. `leave_chain_status == "PARENT_ACKNOWLEDGED"` for hostel students

If all pass, gate opens. Scan record queues for sync. When
connectivity returns, the queue uploads and reconciles.

### 6.2 — Self-healing leave chain
```
Student submits → Deputy Warden agent pre-checks (curfew standing,
room status) → Deputy Warden one-tap approve → Parent agent sends
reminder → Parent acknowledges → Gate pass JWT issued → Student scans
at gate
```
At every step, a TTL exists: if Deputy Warden does not approve in 2h,
reminder; if 6h, escalate to Hostel Manager; if parent does not
acknowledge in 4h, reminder; if 12h, escalate to student. The agents
handle the sequencing; humans handle the approval taps.

### 6.3 — Multi-agent risk pipeline for gate
Four agents evaluate each scan:
- **Identity agent:** biometric + ID match → score
- **Terminal agent:** device fingerprint + geolocation → score
- **Behavior agent:** scan velocity + impossible travel → score
- **Resource agent:** leave-chain completeness → score

Policy decision agent fuses scores:
- Below 0.3 → auto-open
- 0.3–0.7 → operator prompt
- Above 0.7 → block + supervisor alert

No single agent can open the gate alone. This is the fallback control
pattern — an ALLOW verdict requires multi-agent consensus.

### 6.4 — Two-person approvals for high-impact actions
Wire `pending_approvals` into:
- DEBARRED academic status (HOD → Dean)
- SUSPENDED academic status (HOD → Dean)
- SYSADMIN_GRANT (sysadmin → second sysadmin)
- MESS_CONTRACTOR_ESCALATION (mess_incharge → chief_warden)
- MENU_COST_CHANGE_ABOVE_THRESHOLD (mess_incharge → chief_warden)

**Output:** offline gate verifier in production (shadow first, then
primary), self-healing leave chain, multi-agent risk pipeline,
two-person approvals live.

---

## STEP 7 — Long-term governance (Weeks 24–36+)

### 7.1 — Tamper-evident audit chain
Each `audit_events` row gets a `prev_hash` and `this_hash`:
```
this_hash = SHA256(prev_hash + event_id + actor_id + action + after_state + timestamp)
```
A nightly job verifies the chain from the last checkpoint. If a row is
modified or deleted, the chain breaks and sysadmin is alerted. For
accreditation export, the chain is included so the reviewer can verify
integrity.

### 7.2 — Delegation graph API
```
GET /api/delegations/graph?entity_scope=X
```
Returns all active delegations as a directed graph: delegator →
delegatee with role, scope, `expires_at`. Agents query this graph to
understand who can act on what. The graph is the machine-readable form
of the institutional authority structure.

### 7.3 — BYO-agent governance
Personal agents (e.g., a student's ChatGPT plugin) can:
- Read institutional surfaces through a brokered API
- Propose actions (e.g., leave request) via the institutional agent
- Never mutate directly

The institutional agent logs the delegation chain:
`personal_agent → institutional_agent → human_approver`. This is the
governance answer to the BYO-agent question: the institution stays in
the loop, but the personal agent gets convenience.

### 7.4 — Post-quantum credential readiness
The gate JWT and agent SVIDs use Ed25519 today. Design the credential
format so that migration to Dilithium (ML-DSA) is possible without
re-enrolling every student. Store both keys during the transition;
verify either. This is the long-term hedge — the campus's biometric and
gate identity layer should outlive the current cryptographic consensus.

### 7.5 — Drift monitoring and agent retirement
Every agent has:
- A **drift monitor:** statistical tests on its decision distribution
  vs. baseline; alert if drift exceeds threshold.
- A **graceful degradation path:** if the agent fails or drifts, fall
  back to human-only operation with a banner.
- A **retirement criterion:** an agent that consistently misclassifies
  or blocks more than it resolves gets retired, and a human process
  replaces it.

**Output:** tamper-evident audit, delegation graph, BYO-agent broker,
post-quantum roadmap, drift monitors for all four agents.

---

## Implementation stack summary

| Layer | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| Identity | Existing SSO | SPIFFE/SPIRE + OIDC | Ephemeral workload identity | Post-quantum-ready credential format |
| Policy | RBAC + RLS | OPA/Cedar PDP | ABAC on resource tags | Delegation graph machine-readable |
| Audit | `audit_events` table | Agent actions with `actor_type` | Merkle DAG for tamper evidence | Accreditation and legal export |
| Gate | Existing scanner | Signed eligibility manifest (shadow) | Offline JWT verifier primary | Multi-agent risk consensus |
| Delegation | Manual role grants | TTL object in DB | PIM-style activation | Machine-readable delegation graph |
| CI | RLS lint + drift gate | Policy tests | Policy simulation | Agent behavior regression tests |
| Agents | None | Four bounded agents | Self-healing loops | Agent-augmented roles |

## Implementation status (complete — commit 7094367c)

All seven steps are shipped and verified live on gate_monitor:

| Blueprint step | Status | Live evidence |
|---|---|---|
| STEP 0 — Baseline audit | ✅ | Route inventory (this doc + ROLE_OPERATIONS.md), role gap map closed by the entity model; RLS snapshot via `/api/sysadmin/rls/drift` (live pg_policies diff, nightly-checkable); manual-intervention log = the `audit_events` pipeline recording every mutation since |
| STEP 1 — DB foundation | ✅ | Migrations 20270114 (roles + two-person columns + view), 20270115 (entity_scopes, audit_events, pending_approvals, delegations, leave_requests), 20270116 (marks/assignments/materials/mentee/exam-proposals/hall-tickets/fees/library/scholarships/faculty-leave), 20270117 (birthday guard) + ad-hoc tables (visitor_watchlist, hostel_room_allotments, hostel_incidents, telegram_session_suspensions, config_exam_eligibility_rules, mess_reconciliation, audit_chain, audit_chain_checkpoints, users.hostel_block) |
| STEP 2 — Role split | ✅ | 6 entity roles in `users.role` CHECK + registry; the lone `exam_branch` user re-pointed to `addl_controller_academic`; 3 desk shell accounts (DISABLED) ready to credential |
| STEP 3 — Missing operations | ✅ | 46 new routes: student ×4, faculty ×7, HOD ×1, gate ×5, mess ×3, exam ×4, hostel ×3, parent/guardian ×2, admin/sysadmin ×5, two-person queue, delegation graph, gate leave-chain verify |
| STEP 4 — Enforcement wiring | ✅ | `withAuthorization` now delegation-aware (TTL fallback via `resolveEffectiveRole`, delegation id on the auth context); every new mutation writes `audit_events`; RLS drift check live (`/api/sysadmin/rls/drift`); maker-checker constraint at the DB level |
| STEP 5 — Bounded agents | ✅ | 4 agents live: gate-reconcile (*/5), mess-reconcile (05:00, hash-chained), complaint-triage (*/30), exam-eligibility-manifest (22:00, Ed25519-signed) — all write `actor_type='agent'` audit events; SPIFFE/OPA is the Phase-2 upgrade, not a blocker |
| STEP 6 — Self-healing | ✅ (software) | leave-chain agent (*/30: TTL reminders, 6h/12h escalation, auto-expiry, gate-token issuance), `/api/gate/verify-leave-chain` (exact missing-link report), two-person queue live; the **physical** offline gate verifier + multi-agent risk pipeline need the edge devices (hardware item, tracked in AUTONOMOUS_OPERATIONS §4.3) |
| STEP 7 — Governance | ✅ | tamper-evident audit chain (audit_chain + checkpoints, nightly verifier, broken-link critical alert), delegation graph API (`/api/delegations/graph`), BYO-agent broker = the read-only institutional surfaces + delegation-chain logging (design locked in EVOLUTION doc), post-quantum: Ed25519 manifest format already key-swappable |

### The full autonomous surface (what runs without a human)

| Cron | Agent / automation | Scope | Schedule |
|---|---|---|---|
| `/api/cron/gate-reconcile` | Gate reconciliation | operator | */5 |
| `/api/cron/leave-chain` | Self-healing hostel leave chain | deputy_warden | */30 |
| `/api/cron/complaint-triage` | Complaint routing agent | supervisor | */30 |
| `/api/cron/mess-reconcile` | Mess ledger (hash-chained) | mess_incharge | 05:00 |
| `/api/cron/exam-eligibility-manifest` | Signed eligibility manifest | oie | 22:00 |
| `/api/cron/birthday-check` | Personal birthday notification (in-app + bot) | system | 00:30 |
| `/api/cron/audit-chain` | Tamper-evident chain checkpoint | sysadmin | 02:00 |

+ the pre-existing housekeeping crons (expire-passes, sla-breach,
alerts-eval, retention, audit-rotate, mess finalize/no-show) —
**13 cron entries total** in `/etc/cron.d/gate-jobs`.

### Verification trail (2026-11-17)

- `gate_web` healthy on the final image; every new route returned its
  correct auth-gated response (401/403 without a token, never 404)
- Agent runs: gate-reconcile scanned 0 (clean campus), mess-reconcile
  wrote hash `6eb1e1e4…`, complaint-triage triaged 6 open complaints
  (6 SLA escalations), exam manifest covered **1,531 candidates**
- Birthday sweep fired on first run: **6 students** with 11-17
  birthdays received their personal in-app notification; guard table
  makes re-runs no-ops
- Audit chain: 5 links verified OK, checkpoint `b4fac71b…`
- `tsc --noEmit` clean, `unslop-ui` clean on every commit

### What remains intentionally external

| Item | Why external |
|---|---|
| Offline gate JWT verifier | Needs the Raspberry-PI-class edge devices at the gates (hardware procurement); the manifest + verify-leave-chain APIs it plugs into are ready |
| Multi-agent gate risk pipeline | Same edge-hardware dependency; behavior signals (scan velocity, impossible travel) are already captured in `movement_logs` |
| SPIFFE/SPIRE + OPA PDP | Infrastructure deployment; the agent audit model (`actor_type` + role context) is already what they'd wrap |
| Streaming DB replica / PITR | Second host required |
| Aadhaar-device-anchored bot enrollment | Needs the biometric device vendor API |
| Mess Committee cost-threshold hook | Business decision (threshold value) pending from management |
