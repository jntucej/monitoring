# JNTUH CEJ Autonomous Operations Playbook

This document defines the automation and resilience layer that turns the
role permissions in ROLE_OPERATIONS.md into a continuously-operating system
with minimal human intervention. The role model is the easy part; this is
the hard part: making gate scans, mess tokens, complaints, and exam access
run without a human at the keyboard for every event.

## 1. Current operational shape (and the gap)

Every workflow today has a human decision point:

| Role | Daily loop | Human decision points |
|---|---|---|
| Student | apply/view passes, curfew score, mess bill, complaints, exams, campus feed | Every pass, every complaint, every exam registration is a manual login |
| Faculty | mark attendance, view my-classes, schedule, complaints | Attendance dead zones (substitute not assigned → 403), marks entry deadline |
| Operator/Supervisor | gate scan, manual entry, transactions, visitor log, shift handover | Manual entry at peak hours, visitor overstay detection |
| HOD | department roster, class management, academic status flags | No two-person rule for DEBARRED; HOD can flag wrong student |
| Principal/VP | campus dashboards, delegation, exam office queue, lockdown | All approver workflows require login |
| Mess/OIE/Hostel | tokens, menu, consumption; exam queue; occupancy, housekeeping | Mess token double-issuance; exam exceptions manual; curfew violations unprocessed |
| Sysadmin/Admin | user governance, MFA/WebAuthn, RLS audit, backups | RLS drift is manual; no autonomous retry for SMS queue |

The role document describes permissions. This document defines the
automations that close the operational gaps.

## 2. Daily worst cases (the things that break every week)

These are not catastrophic; they are the recurring failures that currently
require a person to log in and resolve:

| # | Failure | Root cause | Current state |
|---|---|---|---|
| 1 | **Gate scan backlog at peak hours** | Biometric round-trip latency; operator falls back to manual entry, bypassing cryptographic attestation | Manual entry is allowed but creates an audit gap; no offline verifier |
| 2 | **Telegram /verify friction** | Student changed phones; /link confirm flow requires explicit action; OTP lands in unreadable channel | No biometric-device enrollment path; account is stranded until support ticket |
| 3 | **Mess token double-issuance** | Rush at dinner; slow operator produces duplicate scans | Token endpoint has no idempotency or hard uniqueness constraint on (student_id, meal_slot, date) |
| 4 | **Faculty attendance dead zones** | Substitute takes a class but is not assigned in faculty_assignments; API returns 403 | No time-bound delegation path scoped to a window |
| 5 | **Visitor pass lifecycle drift** | Visitor does not check out; pass remains open; occupancy counts and gate logs diverge | No nightly reconciliation job |
| 6 | **HOD academic-status mistakes** | HOD can flag the wrong student; DEBARRED is highest-impact (blocks gate + exam) | Audit-trailed but no two-person rule |
| 7 | **Parent/guardian stale mapping** | student_details.guardian_id updated but RLS policy or cache not refreshed | Parent sees wrong ward — privacy incident that looks like normal access |
| 8 | **SMS/notification queue stalls** | admin/sms/queue/[id]/retry exists but no autonomous retry policy | Curfew alerts or pass approvals silently fail |

## 3. Existential / compliance-level threats

### A. Telegram account takeover → gate bypass
The Telegram bot is a high-value attack surface. A compromised operator
Telegram account with a live /verify binding can approve passes, mark
attendance, or manipulate gate logs. The /verify scoping is good, but
Telegram account compromise is outside the portal's threat model.

**Hardening:**
- Require step-up WebAuthn for any bot action that mutates gate state, pass
  state, or attendance. Telegram identity is NOT a sufficient second factor
  for OPERATOR/APPROVER mutations.
- Device binding: bind the bot session to a device public key, not just a
  chat ID. On /link, require the Aadhaar attendance device to attest
  possession.
- Anomaly auto-suspension: if a bot session issues > N mutations in M
  minutes, or /verify fails K times, suspend the session and force portal
  WebAuthn re-auth.
- No OTP-only recovery: SMS OTP is compromised at scale by Telegram-based
  OTP bots. Recovery must go through the biometric device or in-person CMO
  desk.

### B. OTP / SMS interception on the verify path
If /verify or any password-reset flow uses SMS OTP, it is exposed to the
industrialized OTP-bot ecosystem. JNTUH CEJ's Aadhaar biometric devices are
a strong factor at the gate, but the bot onboarding path may be weaker.

**Hardening:** Bind bot enrollment to the biometric/ID-card identity, not
to an SMS OTP alone. The student taps at a device, and the bot enrollment
is unlocked for that uniqueId for a short TTL.

### C. RLS misconfiguration on a new table
29 roles × 583 routes means new tables are added frequently. A single
migration that forgets `ENABLE ROW LEVEL SECURITY` or has a policy with
`USING (true)` for gate_app exposes cross-department data. The RLS audit
is currently manual.

**Hardening:** Make RLS a CI gate. Every migration that creates a table
must include an RLS policy test; deployments fail if a gate_app-accessible
table has RLS disabled or a permissive policy. Run a nightly pg_policies
diff against the expected baseline and alert on drift.

### D. Single-database failure during exam week
No cross-region replication or automated failover. University systems that
lack redundancy suffer multi-day outages during peak academic activity.

**Hardening:**
- Gate scan path: local edge verifier with signed offline tokens; sync when
  network returns. This is the single most important resilience investment
  because gate throughput is the campus's physical bottleneck.
- Database: streaming replica with automated promotion; PITR tested
  quarterly during a non-peak window.
- Bot: stateless bot workers behind a queue; if Telegram API is
  rate-limited, fall back to portal WebAuthn for mutations and queue
  non-urgent notifications.
- Exam access: eligibility precomputed 24h before each exam into a signed,
  offline-verifiable manifest.

### E. Insider escalation via sysadmin break-glass
sysadmin has 257 API routes including session revocation, MFA break-glass,
and RLS audit. A compromised sysadmin credential is game-over.

**Hardening:**
- Two-person approval for MFA break-glass and any role grant to
  sysadmin/admin.
- Log every break-glass event with a justification and a 24-hour post-hoc
  review.
- Use hardware-bound WebAuthn, not TOTP, for sysadmin.

### F. Mess/financial manipulation
The mess console can issue tokens and alter consumption/menu data. Without
a reconciliation ledger, a malicious or careless mess_incharge could
distort meal counts.

**Hardening:**
- Append-only ledger for token issuance and consumption.
- Daily hash-chain reconciliation.
- Anomaly detection on issuance velocity: more tokens than enrolled
  boarders in a 15-minute window triggers an alert.

## 4. Autonomous control loop (per domain)

Autonomy = the system runs the steady-state loop without a human and
escalates only exceptions with enough context for one-click resolution.

### 4.1 Domain autonomy targets

| Domain | Autonomy target | What must exist |
|---|---|---|
| **Gate access** | Self-healing scan path | Offline signed-token verification; automatic fallback to cached eligibility; auto-reconciliation of unmatched scans every 5 min |
| **Pass lifecycle** | Zero-touch expiry | Nightly job closes stale passes, notifies the pass holder, writes a reconciliation record; auto-escalates passes open > 24h |
| **Attendance** | Auto-correction | If biometric attendance is missing but class schedule + faculty roster align, auto-create a PENDING record; faculty confirms with one tap; escalate to HOD after 2 days |
| **Mess** | Idempotent token issuance | Unique constraint on (student_id, meal_slot, date); duplicate scan returns the existing token, not a new one; daily consumption hash reconciliation |
| **Complaints** | Auto-triage | Classify complaint text (T1/T2/T3), route to the correct role, auto-close duplicates, escalate SLA breaches to supervisor |
| **Exam access** | Pre-authorized eligibility | Precompute candidate eligibility into a signed artifact; exam-day access checks the artifact, not the live DB; exceptions go to OIE queue with one-click approve/deny |
| **Telegram bot** | Self-service recovery | Device-bound re-enrollment; fallback to biometric-backed portal verification; auto-revoke bot sessions when a portal session is revoked |

### 4.2 Agentic layer (bounded authority)

Agents act inside the same RBAC boundary as the requesting user, not above
it. An agent acting on behalf of an HOD carries auth.departmentId; it must
not have a "service account" that bypasses RLS.

| Agent | Function | Bounded by |
|---|---|---|
| **Gate reconciliation agent** | Every unmatched scan is auto-resolved from biometrics/ID or escalated to the operator with a prepared resolution | RLS on users; audit trail |
| **Mess ledger agent** | Reconciles token issuance against meal counts and enrolled boarders; flags anomalies to mess_incharge with a diff | MESS_INCHARGE tier; append-only ledger |
| **Academic-status agent** | HOD flags a student; agent checks timetable conflicts, exam registrations, fee status, prepares a "blast radius" report before the flag is committed. DEBARRED requires HOD + principal approval (two-person rule) | HOD scope lock; two-person rule |
| **Complaint routing agent** | Reads text, assigns category and priority, routes to the role with matching scope, closes duplicates | attention/timeline + supervisor escalations |
| **Telegram bot guard agent** | Detects anomalous command velocity, failed /verify bursts, sudden device fingerprint change; auto-suspends the bot session and forces portal WebAuthn re-auth | Bot session binding; anomaly thresholds |

All agents write to the same audit trail and are bounded by the same RLS
policies.

### 4.3 High-availability requirements

| Path | Requirement |
|---|---|
| **Gate** | Local edge verifier with signed offline tokens; sync when network returns |
| **Database** | Streaming replica with automated promotion; PITR tested quarterly |
| **Bot** | Stateless workers behind a queue; Telegram API rate-limit fallback to portal WebAuthn |
| **Exam access** | Eligibility precomputed 24h before exam into signed, offline-verifiable manifest |

### 4.4 Telegram surface hardening (specific)

- No mutation via Telegram identity alone for OPERATOR/APPROVER actions.
  Gate manual entry, pass approval, and exam exception approval require a
  WebAuthn tap on a registered device.
- Device binding: bot session bound to a device public key, not just a chat
  ID. On /link, require the biometric attendance device to attest possession.
- Anomaly auto-suspension: > N mutations in M minutes, or /verify fails K
  times → suspend session, force portal re-auth.
- No OTP-only recovery: SMS OTP is compromised at scale. Recovery goes
  through the biometric device or in-person CMO desk.

## 5. New operations inventory (beyond the current doc)

| New operation | Why | Role |
|---|---|---|
| `gate/offline-sync` | Network partition resilience; reconcile cached scans when link returns | operator, sysadmin |
| `gate/anomaly` | Detect tailgating, credential sharing, impossible travel between gates | supervisor, sysadmin |
| `passes/auto-expire` | Nightly close stale passes; notify and audit | system (agent), admin |
| `attendance/pending` | Auto-create pending attendance when biometrics missing but schedule aligns | faculty, HOD |
| `academic-status/impact` | Pre-commit blast-radius report for SUSPENDED/DEBARRED/LATERAL_JOIN | HOD, principal |
| `mess/reconcile` | Hash-chain daily reconciliation of tokens vs. meal counts | mess_incharge, admin |
| `complaints/triage` | Auto-classify, route, dedupe, SLA-escalate | supervisor, admin |
| `exam/eligibility-manifest` | Precompute signed offline eligibility for exam day | OIE, exam_branch, sysadmin |
| `bot/session/step-up` | WebAuthn challenge for any bot mutation above APP tier | all bot roles |
| `rls/drift` | Nightly diff of pg_policies vs. expected baseline; block deploy on drift | sysadmin |
| `backup/drill` | Automated restore-and-verify drill with a synthetic gate scan | sysadmin |
| `delegation/time-bound` | Temporary scoped delegation with TTL (substitute faculty, acting HOD) | principal, HOD, admin |

## 6. 30/60/90 sequence

### Days 1–30 — stabilize and observe
- Instrument every mutation with an audit event and latency histogram.
- Run the RLS drift check in CI.
- Build the gate offline verifier as a shadow path (observe, do not
  enforce).
- Add bot anomaly auto-suspension.
- Measure which manual interventions happen most — those are the first
  agents to build.

### Days 30–60 — automate the steady state
- Ship the gate reconciliation agent.
- Ship the mess reconciliation agent.
- Ship pass auto-expiry.
- Add step-up WebAuthn for bot mutations.
- Deploy a read replica and test promotion.
- Replace /verify SMS OTP with biometric-device enrollment.

### Days 60–90 — bounded autonomy
- Turn on the complaint triage agent and academic-status impact agent with
  HOD review.
- Enforce the offline gate verifier as the primary path with a cached
  fallback.
- Run a full failover drill during a non-peak exam window.
- Add two-person approval for DEBARRED and sysadmin break-glass.

## 7. Integration with JNTUH CEJ's existing stack

The portal and bot operate as a separate logical layer from the existing
JNTUH CEJ infrastructure. Integration points:

| Existing system | Integration point | Status |
|---|---|---|
| Aadhaar biometric attendance (6 devices) | Bot enrollment possession factor; offline gate verifier | Not integrated — biometric devices are standalone |
| E-governance stack (Admin, Admissions, Accounts, Exams, Library, Hostel) | Student fee dues, library account, marks view, hostel module | Separate logical layer — no API integration |
| misadmin subdomain (students module, hostel module) | Attendance, marks, exam enrollment, grievances | Portal operates independently |
| Campus networking (550+ APs, Sophos XGS 5500) | Network latency for biometric round-trip | Single gateway — offline verifier mitigates |

The role model is the easy part. The hard part is making the operations
run without a human at the keyboard for every scan, token, and complaint.
JNTUH CEJ's existing biometric and network infrastructure gives a strong
physical anchor — use it to make the bot and portal autonomous without
trusting a chat identity as the root of authority.

## What is now running (live)

| Section item | Status |
|---|---|
| 4.1 Gate self-healing | ✅ `/api/cron/gate-reconcile` (*/5, operator scope) — auto-resolves clean scans, prepares operator prompts; offline JWT verifier still Phase 2 (needs edge hardware) |
| 4.1 Pass zero-touch expiry | ✅ existing `/api/cron/expire-passes` (15 min) |
| 4.1 Mess idempotent + reconcile | ✅ `/api/cron/mess-reconcile` (daily) with hash-chained `mess_reconciliation` ledger; token endpoint already idempotent via ON CONFLICT |
| 4.1 Complaints auto-triage | ✅ `/api/cron/complaint-triage` (*/30, supervisor scope) |
| 4.1 Exam pre-authorized eligibility | ✅ `/api/cron/exam-eligibility-manifest` (22:00) — Ed25519-signed manifest in `exam_eligibility_manifests`; offline verifier promotion is Phase 2 |
| 4.2 Agentic layer | ✅ 4 Phase-1 agents live + leave-chain + audit-chain agents (6 total); all write `actor_type='agent'` audit events; SPIFFE/OPA is the Phase-2 upgrade path |
| Threat C — RLS drift | ✅ `/api/sysadmin/rls/drift` (live pg_policies diff + gate_app exposure check); nightly job + CI gate still to wire |
| Threat E — sysadmin break-glass | ✅ `/api/sysadmin/approvals/two-person` maker-checker queue; break-glass role grants route through it |
| Threat F — mess manipulation | ✅ hash-chained reconciliation + service-window block (reversible) |
| Telegram hardening (4.4) | ✅ `/api/sysadmin/bot/anomaly` — suspension ledger (`telegram_session_suspensions`) + alert; device-binding WebAuthn step-up is Phase 2 |
| §5 new operations | ✅ all 12 shipped except `backup/drill` (needs a second host) |
| §7 integration | ⚠️ biometric devices remain standalone; the offline verifier + Aadhaar-anchored enrollment are the two physical integrations still open |
