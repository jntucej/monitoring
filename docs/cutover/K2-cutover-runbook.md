# Cutover runbook — Gate Monitor (K2)

T-14 → T+1. Owners are named, not titles: fill the brackets at T-7.

## T-14 days → T-1 day

| When | What | Owner | Done when |
|------|------|-------|-----------|
| T-14 | Freeze scope. No new features. Only go-live blockers. | Release lead | Feature branch closed |
| T-14 | Walk all 22 roles through every leaf route, staging, real data | QA lead | `verify-all-roles.ts` green |
| T-10 | Full restore drill to a separate host (J3) | SRE | RTO recorded, ≤ target |
| T-7 | Run every Batch J drill; fix any fail | SRE | All evidence `pass` |
| T-7 | Soft freeze — PRs allowed, no merges to main | Release lead | Branch protection on |
| T-5 | Train gate operators (2 sessions + competency checklist) | Ops lead | [N]/[N] signed |
| T-3 | Send parent email + student announcement + faculty memo | Comms | Sent timestamps logged |
| T-2 | Hard freeze — no changes to main | Release lead | CI on frozen SHA |
| T-1 | Final go/no-go review. Walk the 12 criteria. Sign or don't. | Principal | Signed memo |
| T-1 | Confirm on-call rota, phone numbers, escalation tree | Ops lead | Rota circulated |
| T-1 | Fresh backup + cold copy + verify | SRE | `verify-backup.sh` green |

## T-0 — the day (hour by hour)

| Time | Action | Pass condition |
|------|--------|----------------|
| 06:00 | War room opens. Roll call. Go/no-go re-confirmed verbally. | All 4 on the call |
| 06:15 | Final pre-flight: `verify-prep.sh`, `verify-base.sh`, disk >30% free | All green |
| 06:30 | Deploy. Migrations run before app start (compose migrate service). | Migration exit 0 |
| 06:45 | Health checks. | `docker compose ps` all healthy, 100% |
| 07:00 | First real scan at the main gate. Operator scans a staff volunteer. | Success flash, audit row lands |
| 07:15 | First parent SMS (if a pass is approved). | SMS queue → delivered |
| 07:30 | Open gates to normal traffic. Watch the drift dashboard every 15 min. | Error rate <0.5% |
| 09:00 | Morning peak. Check scan p95 <1.5s, no auth failures. | p95 <1.5s |
| 12:00 | Midday check. Mess token flow exercised. | One real meal served |
| 16:00 | Afternoon peak. Check parent notification delivery. | 0 stuck in queue >5 min |
| 19:00 | Evening peak. | Error rate <1% |
| 21:00 | Curfew flow. Check late-return flagging. | 1 test late-return flagged |
| 23:00 | Day-0 close. Log the numbers. Send day-0 summary to Principal. | Summary sent |

## T+1
- Morning stand-up: read the day-0 numbers, decide "continue" or "pause".
- If continue: enter hypercare (K3) at T+48h, not T+0 — the first day's noise isn't the baseline.
