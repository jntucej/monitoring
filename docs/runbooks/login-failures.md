# Runbook: Login Failures & Spike Remediation

## Symptoms & Detection
- Alert: `LoginFailureSpike` (Login failure rate > 5% over 5 minutes)
- Endpoint: `POST /api/auth/login` returning 401/429
- Observability: Prometheus metric `http_requests_total{route="/api/auth/login", status="401"}`

## Verification
1. Run triage script:
   ```bash
   bash scripts/why-login-failed.sh
   ```
2. Inspect login lockout table and failed audit records:
   ```sql
   SELECT performed_at, metadata->>'login' AS identifier, metadata->>'reason' AS reason
   FROM audit_logs
   WHERE action = 'LOGIN_FAILED'
   ORDER BY performed_at DESC
   LIMIT 20;
   ```

## Immediate Mitigation
1. **Targeted IP Brute Force**:
   Block offending IP at edge or in Caddy:
   ```bash
   iptables -I INPUT -s <OFFENDING_IP> -j DROP
   ```
2. **Account Lockout Reset**:
   If an administrator or staff member is locked out due to password fatigue:
   ```bash
   docker exec -i gate_postgres psql -U gate_app -d gate_monitor -c \
     "DELETE FROM rate_limit_buckets WHERE key LIKE '%auth_login%';"
   ```

## Rollback / Recovery
If a bad deploy introduced credential hash mismatch, execute:
```bash
bash scripts/quick-recover.sh
```
