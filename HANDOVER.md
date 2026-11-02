# Gate Monitor — Handover Document

> **For the next maintainer.** You have not seen this system. This is the
> only document you need to get oriented in the first 30 minutes, and the
> escalation path when something goes wrong at 3am.

---

## 1. What this system does

Gate Monitor is a self-hosted, five-container monitoring stack for a
residential campus (UC EJC). It watches:

- **Gate access** — scan events at physical gates (student/operator movements)
- **Infrastructure** — 4 container health (Postgres, Redis, Web, Worker),
  disk, DB pool, queue depth, SSE stream count
- **Application** — API error rates, p95 latency, announcement/mess/complaint
  write paths, RBAC enforcement
- **Autonomous self-heal** — restarts containers, prunes backups, raises pool
  size, and escalates irreversible actions to a human approval gate

The five containers: `gate_postgres`, `gate_redis`, `gate_web` (Next.js),
`gate_worker` (job scheduler + autonomous SRE loop), `gate_caddy` (reverse
proxy + the static `/status` page that survives even when `gate_web` is down).

```
caddy:80 ──► web:3000 (Next.js, all routes + /api/health)
                │
                ├──► postgres:5432 (gate_monitor DB, gate_app RLS user)
                ├──► redis:6379 (rate-limit, session cache)
                └──► worker:3001 (job scheduler + infra_sre_loop)

caddy also serves /status from a static file (survives web down)
worker writes /usr/share/status/status-last.json every 60s → caddy serves it
```

---

## 2. Day-one login

```bash
# From the host:
docker compose -f /opt/monitoring/compose/docker-compose.yml ps

# The web is at http://<host>:80 (behind caddy) or https://<domain>
# Sysadmin credentials are in .env (POSTGRES_PASSWORD, GATE_ADMIN_LOGIN, etc.)
# First login: see scripts/create-first-sysadmin.sh

# Direct DB access (for triage):
docker exec -it gate_postgres psql -U postgres -d gate_monitor
```

---

## 3. RTO / RPO targets

```
RTO: 4 hours (system fully down before it is a crisis)
RPO: 1 hour  (maximum acceptable data loss window)

Backup: hourly (0 * * * * master-backup.sh → gate-db-*.sql.gz)
Verify: nightly 03:15 (verify-backup.sh → scratch DB restore drill)
Restore drill: quarterly, first Tuesday 03:00 (quarterly-restore-drill.sh)
Chaos test: monthly, Sunday 02:00 (monthly-chaos-test.sh)
```

If the restore drill takes > 240 minutes, that is the incident — fix the
runbook, not the drill.

---

## 4. Escalation ladder

```sql
-- live in escalation_contacts, editable at /sysadmin/actions
Level  Role       Wait   Channels
-----  ---------  -----  -----------------------
1      sysadmin    0 min  telegram, email
2      sysadmin   15 min  telegram, sms
3      principal  60 min  telegram, sms, email
4      admin     240 min  sms, email
```

After level 4, nothing irreversible happens:
- Tier 1 auto-actions (restart containers, prune backups) continue
- Tier 2 approval-required actions auto-reject after 24h
- Tier 3 alerts write to `alerts` + `status_updates` (visible at /status)

---

## 5. The four dashboards

| URL | Who | What |
|---|---|---|
| `/status` | anyone (Caddy static) | Green/yellow/red + last 5 incidents + RTO/RPO. Survives web down. |
| `/admin/health` | admin, sysadmin | Container health, DB pool, queue depth, worker heartbeats |
| `/sysadmin/actions` | sysadmin | Approval gate: pending operator_actions + kill switches + forecasts |
| `/sysadmin/health` | sysadmin | Full infra: infra_snapshots, infra_forecasts, auto_policies |

---

## 6. Kill switches

All in the `automation_controls` table, toggleable at `/sysadmin/actions`:

| Switch | Stops |
|---|---|
| `auto_heal_enabled` | All container restarts in auto-heal-watchdog.sh |
| `auto_scale_enabled` | Forecaster creating operator_actions rows |
| `auto_response_enabled` | Auto-execution of low-risk operator_actions |
| `backup_verify_enabled` | Nightly verify-backup.sh drill |
| `drill_enabled` | Quarterly restore drill + monthly chaos test |

**To stop all automation immediately:**
```sql
UPDATE automation_controls SET enabled=FALSE,
  reason='emergency stop by <name>',
  disabled_by=(SELECT id FROM users WHERE login='sysadmin')
WHERE name IN ('auto_heal_enabled','auto_scale_enabled','auto_response_enabled');
```

---

## 7. How to restore from backup

1. **Identify the newest backup:**
   ```bash
   ls -lt /opt/monitoring/backups/gate-db-*.sql.gz | head -3
   ```
2. **Create a scratch DB:**
   ```bash
   docker exec gate_postgres psql -U postgres -c "CREATE DATABASE restore_check TEMPLATE template1;"
   ```
3. **Restore:**
   ```bash
   gunzip -c /opt/monitoring/backups/gate-db-LATEST.sql.gz \
     | docker exec -i gate_postgres psql -U postgres -d restore_check -v ON_ERROR_STOP=1
   ```
4. **Verify table count matches live:**
   ```bash
   docker exec gate_postgres psql -U postgres -d restore_check -tAc \
     "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
   ```
5. **Point the app at the restored DB** (or use it as reference data)
6. **Drop the scratch DB:**
   ```bash
   docker exec gate_postgres psql -U postgres -c "DROP DATABASE restore_check;"
   ```

The quarterly drill (`scripts/quarterly-restore-drill.sh`) automates all
of this and writes a `status_updates` row.

---

## 8. Where the runbooks live

```
docs/runbooks/
  disk-free-low.md      — backup volume filling
  worker-down.md        — gate_worker crashed / queue backlog
  telegram-down.md      — alert push channel broken
  predictor-stale.md    — no infra_snapshots in 10 min
  queue-backlog.md      — email queue > 1000 pending
  gate-offline.md       — physical gate scanner not reporting
  login-failures.md     — user can't log in
  deploy-rollback.md    — bad deploy, need to roll back
  scan-duplicates.md    — duplicate gate scan events
  audit-tamper.md       — audit_logs chain broken
```

Every alert in `alert_rules` links to one of these. The Telegram message
includes the runbook URL.

---

## 9. The 10 things that will break first

1. **Disk fills** — hourly backups accumulate; free-space pre-check is the guard,
   but if retention floor is misconfigured, the volume fills in ~2 weeks.
2. **gate_worker OOM** — unbounded queue backlog or a leaking job; the 512m
   cap catches it but the queue stops processing.
3. **DB pool exhaustion** — web pool × replicas + worker pool > max_connections;
   the pool-budget boot check catches it at startup.
4. **Postgres restart kills LISTEN** — the pg LISTEN channel dies; the worker
   reconnects automatically, but operator_actions NOTIFYs are lost.
5. **Telegram token revoked** — alerts fire but never deliver; fallback is
   the `alerts` table + `/status` page.
6. **Bad image deploy** — `docker compose up` pulls a broken build; the
   auto-heal circuit breaker (3 restarts / 30 min) trips and escalates.
7. **RLS policy drift** — a new table is created without a `gate_app` write
   policy; writes fail silently. The CI gate `check-gate-app-write-set`
   catches it at deploy time.
8. **Caddy cert renewal fails** — cloudflared + Caddy both need valid certs;
   check `docker logs gate_caddy` weekly.
9. **Audit constraint gap** — a new audit action string is written without
   being in `audit_logs_action_known`; the INSERT fails. The constraint is
   rebuilt by migration `20270104000002`; new actions need a new migration.
10. **The next maintainer** — the person who inherits this at 3am with no
    context. That's why this document exists. Read it first.

---

## 10. Incident severity guide

| Severity | Definition | Response |
|---|---|---|
| SEV-1 | All gates down, DB unreachable, or data loss confirmed | Auto-heal immediately; page on-call; write `status_updates` row |
| SEV-2 | One key role can't log in, or queue backed up > 1h | Auto-heal; escalate if it fails; write `status_updates` row |
| SEV-3 | Degraded performance, non-critical feature broken | Log to `operator_actions`; auto-heal if possible |
| SEV-4 | Cosmetic, single page, single user | Log only |

---

## Quick command reference

```bash
# Full system health
docker compose -f /opt/monitoring/compose/docker-compose.yml ps
curl -s http://127.0.0.1:80/api/health

# Check all worker heartbeats
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT job_name||'='||last_status FROM worker_job_heartbeats ORDER BY job_name;"

# Force a fresh backup now
bash /opt/monitoring/compose/scripts/master-backup.sh

# Run the verify drill manually
bash /opt/monitoring/compose/scripts/verify-backup.sh

# Check the DR drill log
cat /opt/monitoring/compose/backups/drill.log

# Kill all automation
docker exec gate_postgres psql -U postgres -d gate_monitor -c \
  "UPDATE automation_controls SET enabled=FALSE WHERE name LIKE 'auto%';"

# Restart everything
docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --force-recreate
```
