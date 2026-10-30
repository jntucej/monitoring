# Runbook: Scan Duplicates & Race Conditions

## Symptoms & Detection
- Alert: `DuplicateScanAnomaly`
- High error rates on `POST /api/gate/scan` returning status 409 or duplicate pass rejection

## Verification
1. Inspect concurrent scans in movement logs:
   ```sql
   SELECT user_id, count(*), array_agg(timestamp)
   FROM movement_logs
   WHERE timestamp > NOW() - INTERVAL '10 minutes'
   GROUP BY user_id
   HAVING count(*) > 1;
   ```
2. Verify Redis distributed locking service:
   ```bash
   docker exec gate_redis redis-cli -a "$REDIS_PASSWORD" ping
   ```

## Immediate Mitigation
1. Clear stale gate lock keys if an operator container crashed mid-transaction:
   ```bash
   docker exec gate_redis redis-cli -a "$REDIS_PASSWORD" --scan --pattern "gate:lock:*" | xargs -r docker exec gate_redis redis-cli -a "$REDIS_PASSWORD" del
   ```
2. The `process_gate_scan` stored procedure uses row-level locking (`FOR UPDATE`) on the student record to serialize operations. If locks remain held, check pg_stat_activity:
   ```sql
   SELECT pid, query, state, age(clock_timestamp(), query_start)
   FROM pg_stat_activity
   WHERE query LIKE '%movement_logs%' AND state != 'idle';
   ```
