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
