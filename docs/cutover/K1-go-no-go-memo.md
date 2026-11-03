# GATE MONITOR — GO/NO-GO DECISION MEMO (K1)

**Release:** v1.0 · **Target go-live:** [DATE] [TIME] IST · **Prepared by:** [NAME] · **Decision owner:** Principal, JNTUCEJ

## Scope of this release
Campus gate monitoring for [N] students, [N] faculty/staff, [N] gates. Replaces [manual register / previous system]. Includes: gate scan (QR + manual fallback), hostel leave workflow, mess token, parent notifications, audit trail.

## What "go" means
All twelve must be true. Each has a named owner and a piece of evidence — not a verbal "it works."

| # | Criterion | Evidence | Owner | ☐ |
|---|-----------|----------|-------|---|
| 1 | End-to-end UAT passed for all 22 roles | `verify-all-roles.ts` report, 0 broken leaves | QA lead | ☐ |
| 2 | Every security drill in Batch J passed in staging | `scripts/drills/evidence/*.json`, all pass | SRE | ☐ |
| 3 | Security posture page ≥90% green | `/sysadmin/security/posture` screenshot, dated | SRE | ☐ |
| 4 | Restore drill: cold backup → clean host, 4 roles present | `drill-restore-separate-host` evidence, RTO recorded | SRE | ☐ |
| 5 | Audit immutability intact and head export fresh (<26h) | `verify-audit-chain.sh` output | SRE | ☐ |
| 6 | Rollback rehearsed and timed in staging | Rollback log, elapsed minutes | SRE | ☐ |
| 7 | On-call rota staffed T-1 → T+30 | Rota sheet, names + numbers | Ops lead | ☐ |
| 8 | All 4 stakeholder comms sent (≥48h before) | Sent-mail timestamps | Comms | ☐ |
| 9 | Every gate operator trained and signed the competency checklist | Signed sheets, [N]/[N] | Ops lead | ☐ |
| 10 | DPDP consent + privacy notice published (English + Telugu minimum) | URL + screenshot | DPO | ☐ |
| 11 | Breach-notification playbook exists with named owners + templates | This document set, §K6 | DPO | ☐ |
| 12 | Data inventory current within 90 days | Inventory doc, dated | DPO | ☐ |

**Decision:** ☐ GO ☐ NO-GO ☐ GO WITH CONDITIONS: ______________________

**Signed:** Principal ______________ Date ______ · Registrar ______________ Date ______ · IT Head ______________ Date ______

---

## Rollback triggers (the pause thresholds)

Rollback is not a judgment call in the moment. It is pre-agreed. Any one of these, and the release lead stops without asking:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Gate scan error rate | 2% over any 15-min window | Pause new rollouts; revert to manual register at affected gate only |
| Any confirmed unauthorized access to student data | 1 event | Full rollback + breach playbook (§K6) |
| Audit immutability violated | 1 tampered/mutated row | Full rollback; treat as security incident |
| p95 gate-scan latency | 3s for 10 min | Roll back the scan path only |
| Login failure rate | 30% for 10 min | Roll back auth changes; keep reads alive |
| Database unavailable | 5 min | Failover first; rollback only if failover fails |
| Any Sev-1 during cutover window | 1 event | Stop. Decide in the war room. |

Rollback is not the same as "undo the deploy". It means: restore the last known-good backup (proven in K1 #4), point Caddy at the previous release tag, and communicate. It is rehearsed. If it takes more than 30 minutes in rehearsal, it is not ready.
