#!/usr/bin/env bash
# ============================================================================
# create-first-sysadmin.sh
#
# One-shot bootstrap for a fresh deploy: set a usable password on the
# SYSADMIN (and optionally the kiosk OPERATOR) account so the operator can
# actually log in and start working.
#
# Usage:
#   bash scripts/create-first-sysadmin.sh                # interactive
#   bash scripts/create-first-sysadmin.sh <sysadmin-pwd> # non-interactive
#   KIOSK_OPERATOR="" bash scripts/create-first-sysadmin.sh   # skip operator
#
# Env vars:
#   DATABASE_URL    target DB (defaults to .env value or localhost dev URL)
#   KIOSK_OPERATOR  unique_id of the kiosk-default operator to seed (default
#                   "OPERATOR"; set to "" to skip the operator step)
#
# Prints each credential exactly once. Do NOT log them.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Load DATABASE_URL from .env if it exists
if [ -f .env ]; then
  _env_url=$(grep -m1 '^DATABASE_URL=' .env 2>/dev/null | sed 's/^DATABASE_URL=//' | tr -d '"' || true)
  if [ -n "$_env_url" ]; then DATABASE_URL="${DATABASE_URL:-$_env_url}"; fi
fi
DATABASE_URL="${DATABASE_URL:-postgres://postgres:ci_dummy_postgres_password_123@localhost:5432/gate_monitor}"

SYSADMIN_UNIQUE_ID="SYSADMIN"
KIOSK_OPERATOR="${KIOSK_OPERATOR:-OPERATOR}"

sysadmin_pwd="${1:-}"
if [ -z "$sysadmin_pwd" ]; then
  echo -n "Enter the sysadmin temp password (>=8 chars): "
  IFS= read -r sysadmin_pwd
  if [ -z "$sysadmin_pwd" ]; then
    echo "Refusing to proceed: empty password." >&2
    exit 1
  fi
fi

if [ -n "$KIOSK_OPERATOR" ]; then
  kiosk_pwd="${2:-}"
  if [ -z "$kiosk_pwd" ]; then
    echo -n "Enter the kiosk-operator temp password (>=4 digits, or 8+ chars): "
    IFS= read -r kiosk_pwd
    if [ -z "$kiosk_pwd" ]; then
      echo "Refusing to proceed: empty operator password." >&2
      exit 1
    fi
  fi
fi

psql_exec() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -e -X -q "$@"
}

echo "==> Setting SYSADMIN password (unique_id=$SYSADMIN_UNIQUE_ID)"
psql_exec -v "pwd=$sysadmin_pwd" -v "uid=$SYSADMIN_UNIQUE_ID" <<'SQL'
DO $$
DECLARE
  v_hash text;
BEGIN
  SELECT crypt(current_setting('app.pwd'), gen_salt('bf', 10)) INTO v_hash;
  UPDATE users
     SET password_hash = v_hash,
         pin_must_change = false,
         session_version = COALESCE(session_version, 0) + 1,
         updated_at = NOW()
   WHERE unique_id = current_setting('app.uid');
  IF NOT FOUND THEN
    RAISE NOTICE 'SYSADMIN row not found by unique_id; nothing updated.';
  END IF;
END $$;
SQL

if [ -n "$KIOSK_OPERATOR" ]; then
  echo "==> Setting kiosk-operator password (unique_id=$KIOSK_OPERATOR)"
  psql_exec -v "opwd=$kiosk_pwd" -v "uid=$KIOSK_OPERATOR" <<'SQL'
DO $$
DECLARE
  v_hash text;
BEGIN
  SELECT crypt(current_setting('app.opwd'), gen_salt('bf', 10)) INTO v_hash;
  UPDATE users
     SET password_hash = v_hash,
         pin_must_change = false,
         is_kiosk_default = TRUE,
         updated_at = NOW()
   WHERE unique_id = current_setting('app.uid');
  IF NOT FOUND THEN
    RAISE NOTICE 'kiosk operator row not found by unique_id; nothing updated.';
  END IF;
END $$;
SQL
fi

echo ""
echo "============================================================"
echo "Credentials set (record them now; they are NOT stored in plaintext):"
echo "  SYSADMIN login:    $SYSADMIN_UNIQUE_ID"
echo "  SYSADMIN password: $sysadmin_pwd"
if [ -n "$KIOSK_OPERATOR" ]; then
  echo "  Kiosk operator:    $KIOSK_OPERATOR"
  echo "  Operator password: $kiosk_pwd"
fi
echo "============================================================"
echo ""
echo "Runbook:"
echo "  1. Log in at /login with the SYSADMIN credentials above."
echo "  2. Change the SYSADMIN password via admin > users > reset-password."
echo "  3. Set KIOSK_SESSION_REQUIRE_PIN=true in the web container env so the"
echo "     kiosk stops accepting OPEN-mode sessions in production."
echo "  4. For each student: POST /api/users auto-issues a one-shot mobile"
echo "     enrollment code (meta.enrollmentCode in the response). Hand the"
echo "     code to the student; they redeem at /bootstrap (B3)."
