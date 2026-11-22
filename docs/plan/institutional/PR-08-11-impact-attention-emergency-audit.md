# PR-08 → PR-11 (ChainImpact, Executive Attention, Emergency Command, Audit Hardening)

> The intelligence + command + audit layer on top of the PR-02→07
> institutional loop. The principal is a policy/authority node: these
> engines compress 10,000 operational events into "3 decisions required,
> 2 critical incidents, 1 delegation expiring tomorrow" and make every
> consequential action reconstructable.

## PR-08 · ChainImpact Engine

**Goal:** no high-impact decision executes blindly. Before execution,
compute the institutional consequences and require a confirm.

**Changes:**
- `impact_previews` — one row per high-impact decision: the systems
  affected (academic_status, exam_eligibility, gate_permissions, hostel,
  active_passes, notifications, ...), one concrete effect per system, a
  summary ("This action affects 8 systems"), and a confirm flag.
- `computeImpact(decisionId, operation, caseType, subjectId)` — the
  impact map (a debarment touches 6 systems; an approve touches 2; a
  lockdown touches the whole institution + continuous audit) + a live
  count where one exists (active passes for the subject).
- `saveImpactPreview` / `confirmImpact` / `impactConfirmed` — the preview
  is stored; execution of a high-impact op is gated on `confirmed=true`.

**Exit condition (met):** "No high-impact decision executes blindly" —
a debarment computes its 6-system impact preview BEFORE the decision
record is final; the test asserts the preview is stored and
`impactConfirmed` is `false` until the principal confirms.

## PR-09 · Executive Attention Engine

**Goal:** the system determines what deserves executive attention —
compressed, not a raw event dump.

**Changes:**
- `attention_items` — severity-ranked (INFO/WARNING/CRITICAL) items with
  a title + compressed detail + a source link (escalation / sla /
  decision / lockdown / incident / case) + a recommended action + an
  expiry. De-duped on (source_kind, source_id): the principal is not
  re-flooded with the same item.
- `generateAttention` / `attentionQueue` / `resolveAttention` /
  `severityOrder` — the queue is CRITICAL → WARNING → INFO, newer
  first; an item is actionable until resolved or expired.

**Exit condition (met):** "The system can determine what deserves
executive attention" — an emergency command lands on the queue as
CRITICAL automatically (proven by the DB test); a SLA breach or an
authority escalation generates a WARNING/CRITICAL item with an explicit
reason.

## PR-10 · Emergency Command subsystem

**Goal:** emergency execution bypasses normal workflows, but NEVER
bypasses authorization and audit.

**Changes:**
- `emergency_commands` — who → what → why → when → scope → duration,
  plus a mandatory post-incident review for LOCKDOWN/EMERGENCY. The
  command links to the existing `lockdown_broadcasts` row (the data
  plane already reads it for IN/OUT gating) — no new broadcast
  mechanism, no fork.
- `issueEmergencyCommand` — LOCKDOWN/EMERGENCY require the
  `emergency_command` role context (the principal is the single
  emergency-commander) + a substantive reason; ELEVATED/CRITICAL have a
  lower bar. Every command is audited at issuance and lands on the
  attention queue as CRITICAL.
- `reviewEmergencyCommand` / `currentEmergencyState` — the review is
  tracked to closure; the current state is the latest non-archived
  command (no global state table — one state at a time).

**Exit condition (met):** "The principal can issue an emergency command
and the system can propagate it safely" — a LOCKDOWN with no reason is
refused; a LOCKDOWN with a reason is issued + audited + lands on the
queue; the institution's current state becomes LOCKDOWN.

## PR-11 · Audit Hardening

**Goal:** every important event becomes a structured record; you can
reconstruct *why* every consequential action happened.

**Changes:**
- `20270130000005_institutional_audit_hardening.sql` — the guarded
  widening DO-block (the exact `academic_workflow_engine.sql` §5
  pattern) registers the 17 institutional audit actions on the
  `audit_logs.action` CHECK constraint (the closed set the engines
  emit). A missing token = the insert is refused = the audit silently
  fails = the "cannot reconstruct why" failure. The widening is
  idempotent + never drops pre-existing actions.
- `idx_audit_logs_decision_no` — a correlation index on
  `details->>'decision_no'` (partial, only where the key is present) so
  a whole chain (case → decision → impact → audit) is reconstructable
  from one decision id without a sequential scan.
- The engines now emit the full closed action set: every case transition
  is `case.opened/resolved/closed/cancelled` (not just `case.created`),
  an authority refusal is `authority.denied`, a saved preview is
  `impact.computed`, and the decision/attention/emergency/delegation
  actions were already in place.

**Exit condition (met):** "You can reconstruct why every consequential
action happened" — all 17 actions insert cleanly against the scratch DB
(proven by the PR-11 test), and the correlation index lets a chain be
pulled from one `decision_no`.

## Shared manifest

**Depends on:** PR-02 (case), PR-03/04 (workflow + authority),
PR-05/06/07 (escalation + decision + delegation).

**Migration required:** `20270130000004_institutional_impact_attention_emergency.sql`
(+ `.down.sql`) — three tables (`impact_previews`, `attention_items`,
`emergency_commands`) + `20270130000005_institutional_audit_hardening.sql`
(+ `.down.sql`) — the CHECK widening + correlation index. All
idempotent; downs verified by re-replay.

**Database changes:** three new tables + one widening + one index.
`impact_previews.decision_id` → `decisions.id`; `attention_items.case_id`
→ `cases.id`; `emergency_commands.lockdown_id` → `lockdown_broadcasts.id`
(existing). No domain data moved.

**API changes:** the engine surface (`computeImpact` / `generateAttention`
/ `issueEmergencyCommand` / the audit actions). The HTTP routes land with
PR-12 (Principal Command Center), the natural consumer.

**Security impact:** a high-impact op cannot execute without a confirmed
impact preview; an emergency command cannot be issued without the
emergency_command context + a stored reason; every step of the loop is in
the closed audit set with a correlation id. This is the substrate PR-14
(SoD + adversarial) tests against.

**Tests:**
- `tests/unit/institutional-impact-attention-emergency.test.ts` (9:
  impact map + severity ordering + emergency-state ranking + the
  decision→impact→confirm chain + emergency command issuance)
- `tests/unit/institutional-audit-hardening.test.ts` (2 pure + 2
  DB-backed: the 17-action closed set + the correlation index)

**Rollback:** the two `.down.sql` files drop the three tables, reverse
the widening, and drop the index. No domain data is affected.

## Next

PR-12 (Principal Command Center) is the thin UI: `/principal/attention`,
`/principal/decisions`, `/principal/escalations`, `/principal/governance`,
`/principal/delegations`, `/principal/emergency`, `/principal/audit`,
`/principal/analytics` — projections over the engines, no business logic
in the pages. PR-13 then migrates the domains onto the case engine one
at a time (gate passes first).
