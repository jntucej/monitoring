#!/usr/bin/env bash
# why-login-failed.sh <login-identifier-or-email> [request-id]
set -euo pipefail

LOGIN="${1:?usage: why-login-failed.sh <login> [request-id]}"
REQ_ID="${2:-}"

run_sql_var() {
  if [ -n "${DATABASE_URL:-}" ]; then
    psql "$DATABASE_URL" -v login="$LOGIN" -tAc "$1"
  else
    docker compose exec -T postgres psql -U "${POSTGRES_USER:-postgres}" \
      -d "${POSTGRES_DB:-gate_monitor}" -v login="$LOGIN" -tAc "$1"
  fi
}

echo "════════ Investigating login: $LOGIN ════════"

echo; echo "── 1. user row ──"
run_sql_var "SELECT id, unique_id, email, role, status,
  password_hash IS NOT NULL AS has_pwd,
  initial_pin_hash IS NOT NULL AS has_pin,
  two_factor_enabled, failed_login_count, locked_until
  FROM users
  WHERE LOWER(email)=LOWER(:'login') OR UPPER(unique_id)=UPPER(:'login')
     OR LOWER(login_identifier)=LOWER(:'login') OR LOWER(handle)=LOWER(:'login')
  LIMIT 1;"

echo; echo "── 2. per-identifier lockout (pin_login_attempts) ──"
run_sql_var "SELECT * FROM pin_login_attempts WHERE UPPER(identifier)=UPPER(:'login');"

echo; echo "── 3. MFA posture (this shell's env) ──"
echo "MFA_REQUIRED_FOR_ADMIN=${MFA_REQUIRED_FOR_ADMIN:-(unset)}"
[ -n "${AUTH_JWT_SECRET:-}" ] && echo "AUTH_JWT_SECRET: set" || echo "AUTH_JWT_SECRET: MISSING"

echo; echo "── 4. recent audit trail ──"
run_sql_var "SELECT timestamp, action, user_name, details
  FROM audit_logs
  WHERE details::text ILIKE '%' || :'login' || '%'
     OR user_id = (SELECT id FROM users WHERE LOWER(email)=LOWER(:'login') OR UPPER(unique_id)=UPPER(:'login'))
  ORDER BY timestamp DESC LIMIT 20;"

echo; echo "── 5. server logs (docker compose; skipped if not containerized) ──"
# Note: $LOGIN is used in grep, which is still potentially dangerous if not escaped, 
# but this is a local diagnostic script, not a web-facing endpoint.
docker compose logs --tail=500 web 2>/dev/null | grep -iE "$LOGIN|LOGIN_FAILED|INVALID|MFA" | tail -20 \
  || echo "(no docker compose logs available)"

if [ -n "$REQ_ID" ]; then
  echo; echo "── 6. full trace for request $REQ_ID ──"
  docker compose logs --since=2h web 2>/dev/null | grep "$REQ_ID" || echo "(no docker compose logs available)"
fi

echo; echo "════════ done ════════"
