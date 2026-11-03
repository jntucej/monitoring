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

## The two calendar dates that decide whether this is operated or just deployed

- **Next quarterly restore drill** (`drill-restore-to-separate-host.sh`,
  cron `0 4 1 */3 *`) — date + named owner: _______________
- **First PIR** (7 days after hypercare exit) — date + named owner: _______________

If those two dates exist, the system is operated. If they don't, it's just deployed.
