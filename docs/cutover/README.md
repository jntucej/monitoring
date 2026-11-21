# Gate Monitor — Batch K cutover document set (index)

Five documents + one operator card + one evidence pack. No code. All of it
signed at go-live.

| Document | Audience | File | Owner |
|----------|----------|------|-------|
| K1 Go/No-Go memo | Principal, Registrar, IT Head | `K1-go-no-go-memo.md` | Release lead |
| K2 Cutover runbook | The 4 people on the call | `K2-cutover-runbook.md` | SRE lead |
| K3 Hypercare plan | Ops team, on-call | `K3-hypercare-plan.md` | SRE lead |
| K4 Stakeholder comms pack | Parents, students, faculty, operators | `K4-stakeholder-comms.md` | Communications lead |
| K5 Operator quick-reference card | Gate operators (laminated, at every gate) | `../operator-card/K5-operator-quick-reference.md` | Ops lead |
| K6 DPDP evidence pack | Data Protection Board (if asked) | `K6-dpdp-evidence-pack.md` | DPO / IT Head |
| K7 First-30-days watch list | On-call | `K7-first-30-days-watch-list.md` | SRE lead |

**The handoff is not ready until operations has reviewed these and accepted
the open issues with assigned owners — transfer of ownership happens at
acceptance, not at deploy.**

## Two deviations from the upstream spec, both intentional

1. **K3 drift dashboard** — the spec's SQL referenced a `drill_evidence`
   table. This codebase has no such table; drill results live in signed JSON
   files under `DRILL_EVIDENCE_DIR`, exposed by the J5 API
   (`/api/sysadmin/drills`). The dashboard SQL was trimmed to the four CTEs
   that exist in the schema (`movement_logs`, `audit_logs`,
   `notification_sms_queue`, `mess_tokens` — all verified present in the
   live `gate_monitor` database) and the drill status is a companion
   shell one-liner against the J5 endpoint.

2. **K1 #5 "audit hash chain"** — reworded to "audit immutability".
   This codebase's audit guarantee is trigger-based
   (`trg_audit_logs_immutable` blocks UPDATE/DELETE on `audit_logs`), not a
   row-hash chain; the matching drill is J1.6
   (`drill-audit-tamper-detect`).

## Schema note (added 2026-11-21, post-cutover-set)

The cutover document set above was signed against the schema at go-live.
Since then main has gained the **teaching / academic capability layer**
(`assignments`, `submissions`, `extension_requests`, `faculty_assignments`
gating, HOD `/api/academic-status` two-person rule — migration
`20270128000001_academic_subsystem.sql`, commits f140923c → c6cf509a).
Two of the notes above still hold and matter for the academic tables:

- **K3 deviation #1** stands: drill results are still in
  `DRILL_EVIDENCE_DIR` via `/api/sysadmin/drills` — the academic tables add
  no drill evidence.
- **K1 #5 "audit immutability"** note still applies: the academic
  subsystem writes `audit_logs` rows through `POST /api/actions` and
  relies on the same trigger-based immutability, **plus** manual
  `CREATE POLICY` RLS on `submissions` (the only place in the new layer
  using policy-level RLS instead of trigger-level guarantees).

If the watch list (K7) is re-baselined, add a check that
`submissions` policies exist (`SELECT policyname FROM pg_policies
WHERE schemaname='public' AND tablename='submissions'`) — a missing
policy there means student/faculty grading scope is wide open.

## The two calendar dates that decide whether this is operated or just deployed

- **Next quarterly restore drill** (`drill-restore-to-separate-host.sh`,
  cron `0 4 1 */3 *`) — date + named owner: _______________
- **First PIR** (7 days after hypercare exit) — date + named owner: _______________

If those two dates exist, the system is operated. If they don't, it's just deployed.
