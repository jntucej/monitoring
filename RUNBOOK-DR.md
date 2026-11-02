# Gate Monitor — Incident Response & Disaster Recovery

> This is the DR/IR companion to the operational runbooks in
> `docs/runbooks/` and the full handover doc in `HANDOVER.md`.
>
> The autonomous system handles the routine. The runbooks handle the
> unexpected. The drills prove both work. The documentation lets someone
> else pick it up. Without this layer, the autonomous system is a sleeping
> pill: it works until it doesn't, and when it fails, no one can wake it up.

## RTO / RPO

```
RTO: 4 hours (system down before it is a crisis)
RPO: 1 hour  (maximum data loss window)

Backup frequency: hourly (0 * * * * master-backup.sh)
Restore drill:    quarterly, first Tuesday 03:00 — must complete in < 2h
Chaos test:       monthly, Sunday 02:00
```

The backup frequency was changed from every 6 hours to hourly in
`scripts/setup-crons.sh` to close the gap between the 1-hour RPO target
and the old 6-hour RPO.

## Kill switches (automation_controls table)

One row per autonomous job. A sysadmin flips `enabled=FALSE` from
`/sysadmin/actions` (the red button) to stop a specific automation without
touching code. Every autonomous job reads its row before acting.

## 10-item incident-response checklist

- [x] RTO / RPO defined — 4h / 1h (above + HANDOVER.md §3)
- [x] Backup frequency matches RPO — hourly cron in setup-crons.sh
- [x] Restore drill scheduled quarterly — scripts/quarterly-restore-drill.sh
- [x] Chaos test scheduled monthly — scripts/monthly-chaos-test.sh
- [x] Every autonomous failure mode has a runbook in docs/runbooks/
  (disk-free-low, worker-down, telegram-down, predictor-stale, queue-backlog)
- [x] Kill switch table (automation_controls) with one row per job
- [x] Escalation ladder (escalation_contacts) with 4 levels
- [x] /status page served by Caddy even when web is down
  (compose/static-status/status.html + status-last.json via status_data volume)
- [x] Heartbeat for every autonomous job — worker_job_heartbeats +
  infra_snapshots.captured_at
- [x] Incident log — status_updates table (SEV-1/2/3/4 + RESOLVED),
  rendered on /status and /sysadmin/actions
- [x] Handover doc — HANDOVER.md (10 points for a stranger)

## Failure modes of the autonomous system itself

| Autonomous component | What breaks it | Symptom | Recovery |
|---|---|---|---|
| auto-heal-watchdog.sh | OOM-killed by a runaway job | Container stays down; no auto-heal | systemd `Restart=always`; kill switch stops it safely |
| gate_worker | Crashes on bad image or OOM | Queue grows; emails stop; cron stops | auto-heal restarts it; 3-strike breaker escalates to Tier 3 |
| Telegram sendMessage | Network down or token revoked | Alerts generated but never delivered | Fallback chain: email → SMS → alerts table + /status banner |
| pg LISTEN channel | Postgres restarted | LISTEN dies; NOTIFY lost | Worker reconnects; `expire_and_auto_run` polls every 5 min as fallback |
| infra_forecaster | No infra_snapshots in 10 min | Forecasts go stale; auto-scale stops | predictor_stale runbook; escalation |
| gate_web | Container down | Nobody can see what's happening | Caddy serves static /status (independent of Next.js) |
| The sysadmin | Vacation, sick, unreachable | Tier 2 approvals pile up | Escalation ladder: 15m → backup sysadmin; 1h → principal; 4h → emergency list |

**The rule:** every autonomous component has a heartbeat and an escalation
path when its heartbeat is missing. The watchdog that watches itself is a
paradox; the kill switch table is the second watchdog a human can reach.

## SEV classification

| Severity | Definition | Response | Notification |
|---|---|---|---|
| SEV-1 | All gates down, or DB unreachable, or data loss confirmed | Auto-heal immediately; page on-call; write `status_updates` | Telegram + SMS + email |
| SEV-2 | One key role can't log in, or queue backed up > 1h | Auto-heal; escalate if it fails | Telegram |
| SEV-3 | Degraded performance, non-critical feature broken | Log to `operator_actions`; auto-heal if possible | Dashboard card |
| SEV-4 | Cosmetic, single page, single user | Log only | Dashboard only |

Every SEV-1 and SEV-2 writes a `status_updates` row that the `/status` page
renders. When the sysadmin is unavailable, the principal can see what is
wrong and what is being done — and can call the escalation contact list.

## Drill log

| Date | Drill | Elapsed | Result |
|---|---|---|---|
| (first run pending) | quarterly-restore-drill | — | — |
| (first run pending) | monthly-chaos-test | — | — |

Drills are scheduled in `setup-crons.sh`. Append results here after each run.

## 10 things that will break first

See `HANDOVER.md` §9 for the full list with remediation commands.
