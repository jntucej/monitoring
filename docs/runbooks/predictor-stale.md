# Runbook: `predictor_stale`

**Alert:** No `infra_snapshots` row in the last 10 min
**Severity:** SEV-2 (auto-heal has stopped predicting)
**Runbook URL:** /sysadmin/runbooks#predictor-stale

## What this means
The 60s `infra-snapshot` worker job is not writing. The forecaster has no
data to forecast over, so the auto-scale and auto-raise-pool actions stop
firing. This is the "silent" failure — no alert fires, but the autonomous
loop has gone blind.

## Automated response
The worker's `infra-snapshot` job is part of the same scheduler as the other
jobs. If the worker is alive but the snapshot job specifically is failing,
check the job's heartbeat.

## Manual steps
```bash
# 1. Is the worker alive?
docker ps | grep gate_worker

# 2. Is the snapshot job heartbeating?
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT job_name, last_run_at, last_status FROM worker_job_heartbeats
   WHERE job_name='infra-snapshot';"

# 3. How old is the last snapshot?
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT max(captured_at), now() - max(captured_at) FROM infra_snapshots;"

# 4. If the worker is alive but infra-snapshot is failing, check its log
docker logs gate_worker --tail 100 | grep -i "infra-snapshot"

# 5. Common cause: the snapshot job needs access to the backup volume
#    for disk_free_pct. Check the worker's bind mount:
docker inspect gate_worker | grep -A2 /opt/monitoring
```

## Escalation
- 15 min: sysadmin
- 1 hour: principal (the autonomous system is blind for > 1h)
