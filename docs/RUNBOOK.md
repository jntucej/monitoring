# Gate Monitor - Operations Runbook

## 1. Quick Reference Commands

### Stack Lifecycle (via Systemd)
```bash
# Check stack status
sudo systemctl status gate-stack.service

# Restart application stack
sudo systemctl restart gate-stack.service

# Stop stack
sudo systemctl stop gate-stack.service
```

### Docker Compose Direct Management
```bash
cd /opt/monitoring/compose

# View running container health
docker compose --env-file /opt/monitoring/env/production.env ps

# Tail all logs
docker compose --env-file /opt/monitoring/env/production.env logs -f

# Tail specific container logs
docker compose --env-file /opt/monitoring/env/production.env logs -f web
docker compose --env-file /opt/monitoring/env/production.env logs -f worker
```

## 2. Backup & Restore Operations

### Manual On-Demand Backup
```bash
/opt/monitoring/scripts/backup-postgres.sh
```

### Automated Backup Verification
```bash
/opt/monitoring/scripts/verify-backup.sh
```

### Crontab Schedule for Root (`crontab -e`)
```cron
# Nightly PostgreSQL backup at 05:00 UTC
0 5 * * * /opt/monitoring/scripts/backup-postgres.sh >> /opt/monitoring/logs/backup.log 2>&1

# Weekly restore verification test at 06:00 UTC on Sundays
0 6 * * 0 /opt/monitoring/scripts/verify-backup.sh >> /opt/monitoring/logs/verify-backup.log 2>&1
```

## 3. Troubleshooting & Recovery

### 1. Database Connection Refused
- Check container state: `docker ps | grep gate_postgres`
- Verify health: `docker exec -t gate_postgres pg_isready`
- Check logs: `docker logs --tail 100 gate_postgres`

### 2. High Memory or Redis Disconnection
- Check Redis state: `docker exec -t gate_redis redis-cli ping`
- In-memory fallback: Next.js automatically switches to internal memory cache if Redis is down.

### 3. Port 80/443 Conflicts on Deploy
- If host Apache or Nginx is holding port 80/443:
  ```bash
  sudo systemctl stop apache2 && sudo systemctl disable apache2
  ```
- Restart Caddy:
  ```bash
  docker compose --env-file /opt/monitoring/env/production.env restart caddy
  ```

## Autonomous agents & cron (added 2026-11)

Thirteen jobs run from `/etc/cron.d/gate-jobs` (host cron → Caddy →
`/api/cron/*`, all authenticated with `x-cron-secret`). Log:
`/var/log/gate-cron.log`.

| Job | Schedule | What to check on alert |
|---|---|---|
| `gate-reconcile` | */5 | Unmatched manual scans → operator prompts in `alerts` |
| `leave-chain` | */30 | Warden/parent TTL reminders + auto-expiry; gate tokens |
| `complaint-triage` | */30 | SLA escalations → supervisor queue |
| `mess-reconcile` | 05:00 | Hash-chained ledger; service-window block on anomaly |
| `exam-eligibility-manifest` | 22:00 | Signed manifest for the next exam day |
| `birthday-check` | 00:30 | Personal birthday notifications (once/year) |
| `audit-chain` | 02:00 | **Broken chain = critical** — integrity review |
| `expire-passes` / `sla-breach` / `alerts-eval` / `retention` / `audit-rotate` / `mess-finalize` / `mess-no-show-check` | various | Pre-existing housekeeping |

**If `audit-chain` reports `brokenLinks > 0`:** freeze the affected
`audit_events` rows, open a security incident, and do NOT re-run until
the break is forensically explained — the chain is the integrity proof.

**If `mess-reconcile` blocks a service window:** the block is reversible
by `mess_incharge` or `chief_warden` resolving the underlying
`mess_ledger` alert; the agent does not re-issue tokens on its own.

**Agent identities are not user accounts.** They act inside a role
context and are only visible in the audit trail as
`actor_type='agent'` + `role_context`. There is no "service account"
that bypasses RLS.
