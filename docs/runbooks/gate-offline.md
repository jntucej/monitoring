# Runbook: Gate Offline & Kiosk Network Disruption

## Symptoms & Detection
- Alert: `GateDeskOffline` (Scan success rate < 99% for 1 minute or heartbeats absent)
- Operators unable to scan passes or receive 502/503 errors

## Verification
1. Check container health status:
   ```bash
   docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
   ```
2. Check web service HTTP endpoint:
   ```bash
   curl -i http://localhost:80/api/health
   ```
3. Test Postgres connection pool:
   ```bash
   docker exec gate_postgres pg_isready -U postgres -d gate_monitor
   ```

## Immediate Mitigation
1. **Restart Gate Stack**:
   ```bash
   docker compose restart web worker
   ```
2. **Kiosk Pin Failover**:
   Operators can switch kiosk from QR camera scanner to PIN verification fallback if optical readers are failing.

## Rollback
If upstream reverse proxy or Caddy is failing:
```bash
docker compose restart caddy
```
