# Credential Drift — Detection & Repair Runbook

> Reproducible record of the 2026-11-22 login-500 incident (Postgres auth) and the
> demo-account password drift found during the 388-pair role audit.
> All commands below are READ-ONLY unless explicitly marked `[WRITE]`. The fix steps
> are provided for reference only; apply only with explicit authorization.

## Symptom
Login screen shows **"Internal server error during authentication"** — the
`/api/auth/login` route returns **500** (not a 401). `gate_web` health endpoint
503s and the container shows `unhealthy`.

## Root cause (verified path)
`gate_web`'s `DATABASE_URL` (user `gate_app`, 48-char password) no longer matches the
live Postgres role's SCRAM hash. Every DB query throws
`password authentication failed for user "gate_app"` -> login 500.

The on-disk `.env` (`postgres://postgres:***`) ALSO rejects — so **both** the
`gate_app` and the `postgres` role passwords had drifted from the on-disk secrets.
The Postgres data dir dates to 2026-10-11; role passwords were re-stamped by later
security/password-policy work and the `.env`/role hashes were never synced.

## Read-only diagnosis (run these to reproduce)
```bash
# 1. Which credentials does the running web use?
docker exec gate_web printenv DATABASE_URL        # mask the password for display

# 2. Does that password actually authenticate over the real (scram) path?
#    (find the postgres service IP from gate_web's netns, then connect from the host)
WEBIP=$(docker exec gate_web getent hosts postgres | awk '{print $1}')
P=$(docker exec gate_web printenv DATABASE_URL | sed -E 's#.*://[^:]+:([^@]+).*#\1#')
psql "host=$WEBIP port=5432 user=gate_app password=*** dbname=gate_monitor" \
     -Atc "SELECT 1;"     # FATAL: password authentication failed => drift confirmed

# 3. Confirm the stored SCRAM hash does NOT match (the app's driver is the truth):
docker exec gate_web node -e "const{Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>{console.log('DB-OK');process.exit(0)}).catch(e=>{console.log('DB-FAIL:',e.message);process.exit(1)})"

# 4. The trusted loopback inside gate_postgres (trust for 127.0.0.1) — read-only:
docker exec gate_postgres psql -h 127.0.0.1 -U postgres -Atc "SELECT usename,passwd FROM pg_shadow WHERE usename IN ('gate_app','postgres');"
```

## Repair (REFERENCE — apply only with explicit authorization)
The `gate_postgres` container has `trust` on `127.0.0.1`, so you can reach a superuser
without a password and re-sync role passwords to the values the app / `.env` expect.

```bash
# [WRITE] Sync gate_app to the password the web container is already using:
P=$(docker exec gate_web printenv DATABASE_URL | sed -E 's#.*://[^:]+:([^@]+).*#\1#')
docker exec gate_postgres psql -h 127.0.0.1 -U postgres -c "ALTER ROLE gate_app WITH PASSWORD '$P';"

# [WRITE] Sync postgres (superuser) to the on-disk .env value:
PGPW=$(grep -E '^POSTGRES_PASSWORD=' /opt/monitoring/compose/.env | sed -E 's/^POSTGRES_PASSWORD=//')
docker exec gate_postgres psql -h 127.0.0.1 -U postgres -c "ALTER ROLE postgres WITH PASSWORD '$PGPW';"

# Then restart/recreate gate_web so it re-reads env (HELD — needs deploy authorization):
docker compose up -d --force-recreate web
```

## Demo-account (users table) drift — separate, softer issue
The 7 demo roles (faculty, guardian, operator, staff, student, visitor, worker) had
`last_password_change` re-stamped (by the pulled password-policy commit), so the saved
`/root/monitoring/scripts/smoke-creds.json` passwords no longer matched
`public.users.password_hash` (bcrypt, cost 10). The role audit then reported 91
`login-failed` pairs — **not** a UI defect.

Fix (applied 2026-11-22): re-seed the 7 (9 incl. 3 student) accounts' `password_hash`
to a bcrypt(cost=10) of the value in `smoke-creds.json`, so the file stays the source
of truth. Generate the hashes with the app's own library (same trust):
```bash
docker cp /root/monitoring/scripts/smoke-creds.json gate_web:/tmp/smoke-creds.json
# [WRITE] for each demo login L with password P:
#   H=$(bcryptjs.hash(P,10))   (cost must be 10 to match the app)
#   UPDATE public.users SET password_hash='$H', last_password_change=now()
#     WHERE (LOWER(email)=LOWER('$L') OR UPPER(unique_id)=UPPER('$L')
#            OR LOWER(login_identifier)=LOWER('$L')) AND deleted_at IS NULL;
```

## Preventing recurrence
- The 22-commit institutional program's `migrate.ts` was ALSO picking up `*.down.sql`
  rollback files as forward migrations (regex `^\d{14}_` matched them) -> a `42601`
  crash when the new institutional down-files shipped. **Fixed** by adding
  `!name.endsWith(".down.sql")` to the filter (see `scripts/migrate.ts`, local commit).
- After any password-policy/seed commit, re-run the role audit
  (`npx tsx scripts/verify-all-roles.ts`) and, if demo roles start 401'ing, re-sync
  `smoke-creds.json` <-> DB as above.
- After pulling a commit that touched `.env` or seed/role SQL, re-sync the role
  passwords to `.env` before restarting web (the `.env` <-> container <-> DB three-way
  is the recurring trip point).
