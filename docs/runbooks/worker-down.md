# Runbook: `worker_down`

**Alert:** gate_worker container not running OR queue depth > 1000 for 5+ min
**Severity:** SEV-2
**Runbook URL:** /sysadmin/runbooks#worker-down

## What this means
The worker is the job scheduler (email/SMS dispatch, cleanup, infra-snapshot,
forecaster, operator-action-maintenance). When it dies:
- Queues grow (emails stop)
- cron jobs stop
- infra_snapshots stop accumulating → predictor goes stale

## Automated response
auto-heal-watchdog.sh restarts gate_worker within ~30s. If 3+ restarts in
30 min (circuit breaker tripped), it escalates to Tier 3 and stops retrying.

## Manual steps
```bash
# 1. Is it actually down?
docker ps | grep gate_worker

# 2. If down, check the last log lines before it died
docker logs gate_worker --tail 50

# 3. Check the queue depth (this is what the alert threshold is on)
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT count(*) FROM notification_email_queue WHERE status='pending';"

# 4. Restart manually (bypasses the circuit breaker)
docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --force-recreate worker

# 5. Confirm the heartbeats resume
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT job_name||'='||last_status FROM worker_job_heartbeats ORDER BY job_name;"
```

## If the worker restarts but immediately crashes
- Bad image: `docker compose build worker` from clean source, `up -d`
- OOM: check `docker inspect gate_worker | grep -i memory` against the 512m cap
- DB unreachable: `docker exec gate_postgres pg_isready -U postgres`

## Kill switch (if the worker is thrashing)
```sql
UPDATE automation_controls SET enabled=FALSE, reason='worker thrashing'
WHERE name='auto_response_enabled';
```
This stops auto-execution; the worker still runs its other jobs.

## Escalation
- 15 min: sysadmin
- 1 hour: principal
- 4 hours: emergency contact list
