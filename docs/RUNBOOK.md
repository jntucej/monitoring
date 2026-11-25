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

# The compose project reads /opt/monitoring/compose/.env (kept in sync with
# /opt/monitoring/env/production.env — both carry the same AUTH_JWT_SECRET /
# POSTGRES_PASSWORD, so JWT signing matches between the web container and any
# external one-time-link verifier). The systemd service uses the
# production.env path; manual work from the compose dir can omit --env-file
# because .env is picked up automatically.
docker compose ps
docker compose logs -f
docker compose logs -f web
docker compose logs -f worker

# Deploy after a source change (rebuild + recreate the web container):
docker build -t monitoring-web:latest -f Dockerfile --target runner .
docker compose up -d --force-recreate web
```

> **Note:** `docker compose up -d web` errors if it would also start
> `cloudflared` while `TUNNEL_TOKEN` is unset — recreate only `web` with
> `--force-recreate web` (the placeholder TUNNEL_TOKEN is fine).

## 2. Backup & Restore Operations

### Manual On-Demand Backup
```bash
# Full + logical backup (the script the cron job actually runs):
bash /opt/monitoring/scripts/master-backup.sh

# Verify the most recent backup restores cleanly:
/opt/monitoring/scripts/verify-backup.sh
```

### Automated Backup (live schedule)
The production backup is driven by `/etc/cron.d/gate-backup`, **not** a
root `crontab`:
```cron
# /etc/cron.d/gate-backup
0 */6 * * *  root  bash /root/monitoring/scripts/master-backup.sh >> /root/monitoring/backups/cron.log 2>&1
```
Cadence is every 6 hours (matches `master-backup.sh`'s own 6h comment).
Backups land in `/opt/monitoring/backups/` (a.k.a.
`/root/monitoring/backups/` — same tree).

> Legacy `backup-postgres.sh` + nightly `verify-backup.sh` cron entries
> predate `master-backup.sh` and are no longer the live path — do not
> re-add a 05:00 nightly cron for them.

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
