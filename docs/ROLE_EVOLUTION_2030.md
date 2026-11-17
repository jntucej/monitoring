# JNTUH CEJ Time-Lapse Role Evolution Plan (Now → 2030)

The role hierarchy is a permission map for now. To make it hold for a
decade, the architecture must be time-lapsed: each phase adds an
automation layer while the tier controls stay intact, and every phase
assumes the institution will delegate more decisions to systems and
fewer to people. The horizon runs from the current academic year through
~2030 — the period in which agentic AI moves from experiments to governed
campus infrastructure.

The through-line: the role hierarchy does not get looser over time — it
gets more precisely enforced, because every agent action carries the same
scope locks as a human action. The campus moves from a system where a
person must be present for every scan, token, and complaint to a system
where the person is present for the decisions that carry consequence, and
the agents run the rest inside the boundaries the roles already define.

## Phase 0 — Now to mid-2027: Harden the entity model and instrument everything

This phase does not add autonomy. It makes the existing roles observable
and reconcilable — the precondition for everything later. Industry
consensus is explicit: start with observability, not automation. You
cannot safely automate a response to a problem your telemetry does not
reliably detect and classify.

**What must ship:**

1. **Role entity locks.** The exam branch split
   (Controller / Addl. Controller Academic / Addl. Controller Results /
   Addl. Controller Automation) is non-negotiable — JNTUH CEJ's
   autonomous status means it runs its own exams, and the current single
   `exam_branch` role cannot enforce separation between marks entry and
   result processing. The hostel chain — Principal (acting as Chief Warden, role context only) →
   `hostel_manager` → `deputy_warden` (block-scoped) — must be wired to
   the gate so a student's pass is valid only when Deputy Warden approval
   and parent acknowledgement both exist. Without this, the gate remains
   a standalone scanner rather than a verified leave-chain endpoint.

2. **Instrumentation.** Every mutation across the 583 routes emits a
   structured audit event with actor, role, entity scope, delegation
   context (if any), and latency. The goal is a longitudinal dataset:
   which manual interventions recur, which roles escalate most, which
   reconciliation gaps appear daily. This dataset tells you which agents
   to build first.

3. **Two-person controls.** DEBARRED and SUSPENDED academic status
   require HOD flag + Dean/Principal approval now, not later. Sysadmin
   MFA break-glass and role grants to admin/sysadmin carry a second
   approver. The cost of retrofitting two-person approval onto a live
   system is far higher than shipping it in Phase 0.

**Phase 0 deliverable:** a reconciled entity model, an audit-event
pipeline, a ranked list of manual bottlenecks, and the two-person rule
enforced on high-impact flags.

## Phase 1 — Mid-2027 to mid-2028: Bounded agents inside the existing RBAC boundary

Autonomy begins, but strictly inside the roles already defined. The
governance literature (Jisc) is clear: autonomy cannot be left to vendor
defaults — institutions must decide deliberately what an agent may do
without asking, where human approval is mandatory, and how every action
is logged with the steps taken, not just the outcome.

Comparable institutions are already moving: MAHE has begun with five
agents inside its student lifecycle system and plans to scale past 50
within two years, moving from "digitisation to intelligence" where
agents handle exceptions and generate insights rather than just
automating routine tasks. JNTUH CEJ follows the same pattern with
tighter entity scoping.

**First four agents, each bounded to an existing role context:**

| Agent | Bounded to | Function |
|---|---|---|
| Gate reconciliation | operator, supervisor | Watches unmatched scans, checks biometric and ID-card signals, auto-resolves or prepares a resolution for one-click operator confirmation. Never mutates gate state without a match or an operator click |
| Mess ledger | mess_incharge | Reconciles token issuance against meal counts and enrolled boarders, flags issuance velocity anomalies before service begins, writes a hash-chained reconciliation record daily. Cannot issue tokens — only mess_incharge can — but can block a service window if the ledger is inconsistent |
| Complaint triage | supervisor, admin | Classifies incoming complaints, routes to the role whose departmentId or hostel_block matches, deduplicates, escalates SLA breaches. Does not close complaints unless the duplicate is confirmed by the original filer or a supervisor |
| Exam eligibility | oie, exam_branch | Precomputes candidate eligibility from attendance %, fee dues, and academic status into a signed manifest 24h before each exam. On exam day, access checks the manifest, not the live database. Exceptions go to the OIE queue with a prepared approve/deny recommendation; the actual decision stays with exam_superintendent or addl_controller_academic |

**Governed agent identity.** Agents do not log in as users. The Jisc
roundtable flags this directly: granting full user access raises
identity and liability issues. A more cautious approach is tightly
scoped service accounts or permission models designed specifically for
agents. Each agent gets a machine identity bound to the role it serves,
and every agent action carries the role context into the audit trail so
a mess_incharge agent action is indistinguishable in audit from a
mess_incharge human action, except for an `actor_type: agent` field.

**Zero-trust context for dynamic decisions.** The patent literature on
smart-campus multi-agent zero-trust access control describes the right
direction: multiple agents evaluate identity, terminal, network,
behavior, and resource sensitivity; a policy decision agent forms a risk
state; execution feedback corrects the risk state with fallback control
when an agent output is anomalous. For JNTUH CEJ, the gate agent in
Phase 1 should already be feeding behavior signals (scan velocity,
impossible travel between gates, device fingerprint changes) into the
risk context, even if the full multi-agent policy engine arrives in
Phase 2.

**Phase 1 deliverable:** four bounded agents running in production,
governed by service identities, with every action audited at the same
fidelity as human actions.

## Phase 2 — Mid-2028 to 2029: Self-healing operations and entity-wide reconciliation

The system stops needing a human at the keyboard for steady-state
operations. Self-healing infrastructure becomes operationally viable
when observability is mature — organizations are already testing
AI-driven remediation inside observability platforms, cloud
infrastructure, ERP environments, and network operations centers. For
JNTUH CEJ, the focus is the physical-digital boundary: gate, hostel,
mess, and exam access.

**What changes operationally:**

1. **Gate offline verification becomes primary.** The agent issued
   signed offline tokens in Phase 1 as a shadow path. In Phase 2, the
   offline verifier becomes the primary gate path, with the live database
   as a reconciliation source rather than a runtime dependency. A
   student can pass the gate even if the network or the Sophos upstream
   is degraded; the scan reconciles when connectivity returns.

2. **Hostel leave chain becomes self-executing.** A student requests
   leave, the Deputy Warden agent checks curfew standing and room
   status, the parent acknowledgement is verified against the guardian
   mapping, and the gate pass is issued with a signed token. The only
   human steps are the Deputy Warden's approval (one tap) and the
   parent's acknowledgement. The agent handles the sequencing,
   reminders, and expiry.

3. **Mess and fee reconciliation closes the loop.** The mess ledger
   agent extends to vendor purchase orders and rebate ledgers. A new
   student fee agent (bounded to student and parent scope) reconciles
   payments against dues and generates receipts without manual
   intervention for the standard path. Anomalies — partial payments,
   mismatched receipts, rebate disputes — route to admin or
   mess_incharge with a prepared diff.

4. **AI-driven anomaly detection becomes the default responder.** The
   security posture shifts from "campus security team as gatekeeper" to
   "campus security team as coach/verifier," with AI handling
   repeatable evidence collection and eligible response actions while
   humans manage cases requiring institutional judgment. The supervisor
   role in Phase 2 becomes an exception manager rather than a queue
   processor: the agent handles overstay alerts, watchlist matches, and
   tailgating signals, and the supervisor confirms or overrides.

5. **Two-person and delegation become machine-readable.** Delegation
   with TTL — Vice-Principal acting for Principal, senior faculty acting
   for HOD, Addl. Controller acting for Controller — is a first-class
   object with scope, expiry, and audit. Agentic AI will force
   universities to formalize and eventually machine-read delegation
   authority, because giving bounded, auditable authority to a system
   is harder than giving it to a person.

**Phase 2 deliverable:** gate, hostel leave, mess token, and fee
receipt operate through a self-healing loop with human involvement only
on exceptions.

## Phase 3 — 2029 to 2030+: The institution as a governed agent ecosystem

The architecture is no longer a portal with roles bolted on. It is an
agent ecosystem where the role hierarchy defines the boundary of
authority and the agents execute inside those boundaries continuously.

**What changes operationally:**

1. **Every role becomes an agent-augmented role.**
   - Student agent: manages the full lifecycle — fee dues, library
     renewals, scholarship deadlines, exam registration — within the
     student's own scope, never acting on another student's data.
   - Faculty agent: prepares draft marks after an exam, flags weak
     students, proposes internal exam dates; submission remains a
     faculty action.
   - HOD agent: pre-screens academic-status flags with a blast-radius
     report before the HOD commits anything.
   - Deputy Warden agent: runs nightly curfew reconciliation and
     prepares incident summaries for the Principal (warden context).

2. **Bring Your Own Agent becomes a governance question, not a
   technical one.** The Jisc roundtable identifies this as the next
   major student-facing issue: personal agents that initiate actions and
   shape outputs raise comparability, disclosure, and security
   questions that go beyond device access policies. JNTUH CEJ defines a
   minimum standard: personal agents may interact with read-only
   institutional surfaces, but mutations require the institutional agent
   as a broker, and the institutional agent's audit trail records the
   delegation chain.

3. **The audit trail becomes the institution's institutional memory.**
   Every agent action, every human confirmation, every override, and
   every fallback is logged in a tamper-evident chain that answers both
   accreditation requests and legal review. The audit trail carries
   double weight in education because the same logs that prove
   enforcement also answer records requests.

4. **The role hierarchy itself becomes adaptive.** HOD scope,
   exam-branch separation, hostel block scoping, and the gate–hostel–
   parent leave chain remain fixed structural controls. What adapts is
   the delegation graph: who is acting for whom, with what scope, for
   how long — all expressed as machine-readable objects that agents can
   reason about without a human granting a permanent role change.

**Phase 3 deliverable:** a governed agent ecosystem where every role is
agent-augmented, BYO-agent governance is defined, and the audit trail
serves both accreditation and legal review.

## Long-term risks the architecture must absorb

| Risk | Mitigation |
|---|---|
| **Agent sprawl and shadow agents** — unregistered AI agents with excessive permissions are the largest blind spot; traditional firewalls and endpoint detection cannot stop them | Phase 1 service-identity discipline becomes a Phase 3 whitelist: no agent touches institutional data without a registered identity, declared scope, and a sandbox boundary |
| **Model drift in the gate and exam agents** — an agent that handled scan velocity correctly in 2028 may misjudge it in 2030 if campus traffic patterns change | Every agent needs a drift monitor and a graceful degradation path to human-only operation. Observability must precede automation; the same applies to agent retirement |
| **Post-quantum readiness for identity** — zero-trust identity literature already points toward post-quantum preparation | The biometric and gate identity layer built now should use a credential format that can migrate without re-enrolling every student |
| **The human judgment boundary must stay explicit** — delegation cannot mean abdication | The roles that carry formal consequences — DEBARRED, result publication, mess contractor escalation, sysadmin break-glass — retain a human confirmation step even in Phase 3. The agent prepares the evidence; the human commits the consequence |

## Condensed time-lapse table

| Phase | Window | What changes operationally | Role evolution | Control preserved |
|---|---|---|---|---|
| 0 | Now–mid 2027 | Entity locks, audit pipeline, two-person flags | Exam branch split, hostel chain wired to gate | HOD scope, exam separation |
| 1 | Mid 2027–mid 2028 | Four bounded agents, service identities, signed exam manifest | Gate, mess, complaint, exam agents inside existing roles | Agents cannot mutate without role context |
| 2 | Mid 2028–2029 | Offline gate primary, self-healing leave/mess/fee loops | Supervisor becomes exception manager; student/parent fee agents | Delegation TTL, anomaly fallback |
| 3 | 2029–2030+ | Governed agent ecosystem, BYO-agent governance, tamper-evident audit | Every role agent-augmented; delegation graph machine-readable | Structural separations fixed; human commits consequences |

## Where we are against the phases

- **Phase 0 (harden + instrument):** ✅ done ahead of the original
  mid-2027 window — entity locks (all 6 new roles + scope tables),
  structured audit pipeline (`audit_events` with actor_type, entity
  scope, delegation id, latency), two-person controls live on
  DEBARRED/SUSPENDED and on high-risk grants.
- **Phase 1 (bounded agents):** ✅ the four named agents are live as
  cron routes inside their role contexts, plus a leave-chain agent and
  the tamper-evident audit chain (a Phase-3 artifact shipped early).
  SPIFFE machine identities + OPA PDP are the remaining Phase-1
  items.
- **Phase 2 (self-healing):** ◐ in progress — offline gate verifier
  and multi-agent risk pipeline still need the edge hardware; the
  leave chain is already self-executing (TTLs, reminders, auto-expiry,
  gate-token issuance).
- **Phase 3 (governed ecosystem):** ◐ delegation graph API and
  tamper-evident audit are live; BYO-agent broker and
  post-quantum credential migration remain.

The condensed table at the end of this doc reflects the original plan;
the implementation landed ahead of it for Phases 0–1.
