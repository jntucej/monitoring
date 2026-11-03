# Login Failure Runbook

Operational companion to the Login Failure Guide (Parts 1–6). What to do when
someone says "I can't log in."

## Phase 1 — Is it the server or the user?

```bash
curl -i -X POST http://<host>/api/auth/login \
  -H 'Content-Type: application/json' \
  -H "Origin: http://<host>" \
  -d '{"login":"<user>","password":"<pass>"}'
```

Note the `x-request-id` response header (or `error.requestId` in the body) — it
correlates this request with server logs and the audit row.

| Response | Next step |
|---|---|
| 200 `{ data: { token } }` | Server is fine. Bug is client-side → Phase 4. |
| 500 (has `requestId`) | `docker logs gate_web | jq 'select(.requestId=="<id>")'` → Phase 2. |
| 401 `INVALID_CREDENTIALS` | Credentials or role-scope issue → Phase 3. |
| 403 `FORBIDDEN` | CSRF or origin → check `ALLOWED_ORIGIN` includes the browser origin. |
| 403 `ACCOUNT_INACTIVE` | `SELECT status FROM users WHERE ...` → Phase 3. |
| 403 `MFA_REQUIRED` | MFA enforced for this role → enroll, or `MFA_REQUIRED_FOR_ADMIN=false`. |
| 429 | Locked / rate-limited → wait 15 min or clear `pin_login_attempts`. |

## Phase 2 — Server-side (one command)

```bash
./scripts/why-login-failed.sh <login> [request-id]
```

Reads the user row, per-identifier lockout, MFA posture, audit trail, and recent
server logs. The first failing check is your bug. Add the `request-id` from
Phase 1 to see the full structured trace.

To filter structured logs directly:

```bash
docker logs gate_web --since 1h | jq 'select(.route=="/api/auth/login" and .level=="error")'
```

## Phase 3 — Credential / role

```sql
-- Confirm the user row and auth state
SELECT email, role, status,
       password_hash IS NOT NULL AS pwd,
       initial_pin_hash IS NOT NULL AS pin,
       two_factor_enabled, failed_login_count, locked_until
FROM users WHERE LOWER(email) = LOWER('<login>');

-- Recent audit trail for this user
SELECT timestamp, action, details
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE LOWER(email)=LOWER('<login>'))
ORDER BY timestamp DESC LIMIT 20;

-- Clear lockouts (only after confirming it's not a brute-force attempt)
DELETE FROM pin_login_attempts WHERE identifier = UPPER('<login>');
UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE LOWER(email)=LOWER('<login>');
```

If `pwd`/`pin` are both false, the seed never ran or `SEED_DEFAULT_PIN` was
unset (dev generates a random PIN that is never logged). Re-seed:

```bash
SEED_DEFAULT_PIN=<known-pin> node scripts/seed-data.js
```

## Phase 4 — Client-side

Browser devtools:

1. **Network → `/api/auth/login`** — 200 with a token?
2. **Application → Session Storage → `gate-monitor-auth`** — is state populated?
3. **Console** — any `token_class_mismatch` / `Unauthorized`?
4. **Network → the redirect after login** — did it land on `/login` again?
   - Yes + POST was 200 → double-redirect race (Part 2 Bug 6, fixed).
   - Yes + session storage empty → user shape leak (Part 2 Bug 5, fixed).

## Phase 5 — Smoke test the deployment

```bash
SMOKE_USER=<id> SMOKE_PASS=<pin> npm run test:e2e:smoke
```

Skips automatically if `SMOKE_USER`/`SMOKE_PASS` are unset. If it fails, do not
roll forward. If it passes but users still report issues, run Phase 2 against
the specific user.

## Recovery actions

| Symptom | Command |
|---|---|
| Locked out all admins (MFA fail-closed) | `MFA_REQUIRED_FOR_ADMIN=false docker compose up -d web` |
| Health shows `auth.degraded` | Check `/api/health` → `components.services.auth` for which of jwt_secret / totp_encryption / system_config_readable / has_active_users failed |
| JWT secret broken in prod | Set `AUTH_JWT_SECRET` (≥32 chars) in `.env`, recreate `web` |
| Re-seed users with known PIN | `SEED_DEFAULT_PIN=<pin> node scripts/seed-data.js` |
| Session table has stale rows | `UPDATE sessions SET revoked_at = NOW() WHERE expires_at < NOW() AND revoked_at IS NULL;` |

---

# Incident Runbook (Batch I)

**For a sleepy sysadmin at 2am.** Every section: what's wrong → what to run → how to confirm it's fixed. The `/sysadmin/security/posture` page links to these anchors.

## rls-force — RLS not FORCEd

**Symptom:** `/sysadmin/security/posture` shows `RLS FORCE` red.
**Meaning:** some RLS table isn't forced — the table owner (e.g. the migration role) bypasses its own policies.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc "
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r'
     AND c.relrowsecurity AND NOT c.relforcerowsecurity"
# For each table printed:
docker exec gate_postgres psql -U postgres -d gate_monitor -c "ALTER TABLE public.<name> FORCE ROW LEVEL SECURITY;"
```

Confirm: rerun the query, expect empty.

## guc-failclosed — fail-open RLS policies

**Symptom:** Fail-closed GUC red.
**Meaning:** a gate_app policy can return rows without the `app.current_user_id` GUC set — i.e. the app forgot to enter the transaction context and the DB still answered.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc "
  SELECT tablename, policyname, qual FROM pg_policies
   WHERE schemaname='public'
     AND array_position(roles::text[], 'gate_app') IS NOT NULL
     AND qual IS NOT NULL AND qual !~* 'current_setting'"
```

Fix each: the policy must gate on `current_setting('app.current_user_id', true)` (see `src/lib/db.ts` → `withTransaction` for the canonical GUC context). Confirm: rerun query, expect empty.

## audit-tamper — broken hash chain

**Symptom:** Audit chain red.
**Meaning:** a row's `prev_hash` doesn't match the previous row's `row_hash`. A row was deleted, inserted, or modified — or a migration ran on a table that already had un-chained rows.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -c "SELECT * FROM public.verify_audit_chain() LIMIT 20;"
```

Do NOT "fix" the chain by rewriting rows. Investigate:

1. Look at the broken row's timestamp ± 1 hour in `audit_logs`.
2. Check who had DB access in that window (`pg_stat_activity`, `docker logs gate_postgres`).
3. Treat as a security incident: jump to #security-incident-response.

Confirm: `verify_audit_chain()` returns 0 rows.

## backup-freshness — no fresh backup

**Symptom:** Backup freshness (26h) red, or the nightly verify-backup drill failed.

```bash
# 1. Is master-backup.sh running + is the kill switch on?
crontab -l | grep master-backup
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc "SELECT name, enabled FROM automation_controls WHERE name='auto_backup_enabled'"
# 2. Manual run (exit 3 = kill switch off, exit 0 = success)
bash /opt/monitoring/scripts/master-backup.sh; echo "exit=$?"
# 3. Cold copy (exit 2 = no off-host destination configured — NOT a backup)
bash /opt/monitoring/scripts/sync-cold-backup.sh; echo "exit=$?"
# 4. Full drill (restore + cold freshness)
bash /opt/monitoring/scripts/verify-backup.sh | tail -8
```

Confirm: last line says `✓ cold backup is fresh`.

## worker-stale — worker heartbeats missing

**Symptom:** Worker heartbeats red/amber.
**Meaning:** worker jobs haven't completed in >2h — dispatch, SMS, email, audit rotation, SLO snapshots are all stalled.

```bash
docker ps --filter name=gate_worker
docker logs gate_worker --tail 200 | tail -40
docker exec gate_postgres psql -U postgres -d gate_monitor -c \
  "SELECT job_name, last_run_at, last_status, last_error FROM worker_job_heartbeats ORDER BY last_run_at DESC;"
```

Down → `docker restart gate_worker`. Up but stuck → check `CRON_SECRET` in `.env` (worker refuses to start without it).

Confirm: `SELECT count(*) FROM worker_job_heartbeats WHERE last_run_at > NOW() - INTERVAL '5 min'` ≥ 3.

## login-failure-spike — password attack

**Symptom:** Login failures (1h) red (>200).
**Meaning:** credential stuffing or brute force.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -c "
  SELECT details->>'ip' AS ip, count(*) AS attempts
    FROM audit_logs
   WHERE action IN ('LOGIN_FAILED','PIN_LOGIN_FAILED') AND timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY 1 ORDER BY 2 DESC LIMIT 20;"
```

Single hammering IP: `/api/auth/login` already rate-limits per IP+identifier; block at the firewall (`sudo ufw deny from <bad-ip> to any`). Distributed attack landing successes: tighten the login route's `maxRequests`, and for a specific victim user force a password/PIN reset (`/api/admin/users/<id>/reset-password`).

Confirm: 1h count back under 50.

## rate-limit-storm — 429 surge

**Symptom:** Rate-limit hits (1h) red (>5000).
**Meaning:** an attack or a client with an infinite retry loop.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -c "
  SELECT route, user_id, count(*) FROM api_metrics
   WHERE status_code = 429 AND timestamp > NOW() - INTERVAL '1 hour'
   GROUP BY 1,2 ORDER BY 3 DESC LIMIT 10;"
```

I4's forensic columns make the perpetrator a one-row lookup. One path → check that route's `maxRequests`. One user → check their client's retry code. Confirm: 429 rate back under 500/hour.

## circuit-open — a dependency is down

**Symptom:** a downstream (LLM / SMS / email / S3) has failed repeatedly and is fast-failing.

```bash
docker logs gate_worker --tail 100 | grep -i circuit
curl -sf <dependency-url>   # confirm it's actually down
```

Once healthy, the circuit half-opens after ~30s and closes on success — no manual reset. If a broken deploy is the cause: roll back.

## llm-budget — daily LLM budget hit

**Symptom:** /api/bot/chat returns 503; spend crossed the configured ceiling.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -c \
  "SELECT user_id, count(*), sum(cost_inr) FROM llm_cost_ledger
   WHERE created_at > date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')
   GROUP BY 1 ORDER BY 3 DESC LIMIT 10;"
```

One user dominating → kill the LLM switch (`UPDATE automation_controls SET enabled=FALSE WHERE name='auto_llm_enabled';`) or lock the account. Aggregate load → raise `system_settings` `llm_budget.daily_inr`. Spike in cost-per-call → investigate the model/pricing change; the alert is a signal, not a shutdown trigger.

## csrf-spike — CSRF rejections

**Symptom:** CSRF rejections (24h) red (>200).
**Meaning:** either an attacker probing endpoints or a legitimate client (mobile / partner) with a stale session.

```bash
docker exec gate_postgres psql -U postgres -d gate_monitor -c "
  SELECT user_id, route, count(*)
    FROM api_metrics WHERE csrf_result='fail' AND timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20;"
```

`user_id` NULL for most rows → bot traffic. One legitimate user → their client needs a fresh token (log out / back in). Confirm: 24h failures back under 20.

## security-incident-response — compromised system

**Symptom:** broken audit chain, out-of-band admin activity, unexpected `users.role` changes.

Immediate actions, in this order:

1. Freeze everyone except responders:
   ```bash
   KEEP_SELF="<responder-uuid>" REASON="incident" bash scripts/revoke-all-sessions.sh
   ```
2. Disable all automation so healing doesn't undo containment:
   ```bash
   docker exec gate_postgres psql -U postgres -d gate_monitor -c \
     "UPDATE automation_controls SET enabled=FALSE, disabled_by='<responder-uuid>', disabled_at=NOW(), reason='incident' WHERE name LIKE 'auto_%';"
   ```
3. Forensic snapshot BEFORE deleting anything:
   ```bash
   bash scripts/master-backup.sh          # skip only if kill switch is the problem
   docker exec gate_postgres pg_dumpall -U postgres | gzip > /opt/monitoring/incident-$(date +%s).sql.gz
   ```
4. Identify scope:
   ```sql
   SELECT * FROM audit_logs
    WHERE action IN ('ROLE_CHANGED','USER_CREATED','SESSION_FORCE_REVOKED','PASSWORD_CHANGED')
      AND timestamp > NOW() - INTERVAL '24 hours';
   ```
5. Contain + remediate (NIST SP 800-61 §§3.3–3.4).
6. Post-incident: `bash scripts/verify-audit-chain.sh`; re-enable automation only after the chain is proven intact.

## Escalation matrix

| Severity | Contact | When |
|---|---|---|
| SEV-1 | Principal + sysadmin on-call | data loss, account takeover, RLS breach |
| SEV-2 | Sysadmin on-call | backup stale >48h, audit chain broken |
| SEV-3 | Sysadmin office hours | posture <80% green, no attacker signal |
| SEV-4 | Ticket | cosmetic, single user affected |

Contacts: see the `escalation_contacts` table (the ladder it defines is live data, not a PDF).
