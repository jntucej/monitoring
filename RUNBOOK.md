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
