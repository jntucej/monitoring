# Runbook: `queue_backlog`

**Alert:** `notification_email_queue` pending count > 1000 for 5+ min
**Severity:** SEV-2
**Runbook URL:** /sysadmin/runbooks#queue-backlog

## What this means
The email dispatcher is not keeping up. Either the SMTP provider is throttling,
the worker's email-dispatch job is stalled, or a large notification burst
hit the system (e.g. enrollment code expiry, lockdown broadcast).

## Automated response
The worker's `email-dispatch` job runs every 2 minutes. If the queue is
backed up > 1000, the forecaster may create a `restart_worker` operator_actions
row (Tier 1, auto-execute after its window).

## Manual steps
```bash
# 1. Current queue depth
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT count(*) FROM notification_email_queue WHERE status='pending';"

# 2. Oldest pending item (how long has it been waiting?)
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT min(created_at), now() - min(created_at) FROM notification_email_queue
   WHERE status='pending';"

# 3. Is the dispatcher running?
docker logs gate_worker --tail 50 | grep -i "email-dispatch"

# 4. Check the SMTP provider's rate-limit response
docker logs gate_worker --tail 100 | grep -iE "smtp|429|451|throttle"

# 5. If the queue is truly stuck, cancel items older than 24h:
docker exec gate_postgres psql -U postgres -d gate_monitor -c \
  "UPDATE notification_email_queue SET status='cancelled'
   WHERE status='pending' AND created_at < now() - interval '24 hours';"
```

## Escalation
- 15 min: sysadmin
- 1 hour: principal (students/guardians are not receiving critical emails)
