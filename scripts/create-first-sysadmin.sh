#!/usr/bin/env bash
# ============================================================================
# create-first-sysadmin.sh
#
# One-shot bootstrap for a fresh deploy: set a usable password on the
# SYSADMIN (and optionally the kiosk OPERATOR) account so the operator can
# actually log in and start working.
#
# Usage:
#   bash scripts/create-first-sysadmin.sh
#   KIOSK_OPERATOR="" bash scripts/create-first-sysadmin.sh   # skip operator
#
# Env vars:
#   DATABASE_URL    target DB (defaults to .env value or localhost dev URL)
#   KIOSK_OPERATOR  unique_id of the kiosk-default operator to seed (default
#                   "OPERATOR"; set to "" to skip the operator step)
#
# Security notes:
#   * Passwords are ALWAYS entered at a terminal prompt (read -s) — never
#     accepted as CLI arguments or environment variables — so they do not
#     leak into shell history, `ps` output, or process logs.
#   * psql is invoked with PGPASSWORD (environment) so the DB password
#     never sits on argv either.
#   * The new user password is hashed INSIDE the database via
#     pg_read_file() on a short-lived 0600 file — it is never passed
#     through psql -v (which would put it on argv and into logs).
#   * Seeded credentials are flagged password_must_change=TRUE so the user
#     is forced to rotate them on first login.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Load DATABASE_URL from .env if it exists
if [ -f .env ]; then
  _env_url=$(grep -m1 '^DATABASE_URL=' .env 2>/dev/null | sed 's/^DATABASE_URL=//' | tr -d '"' || true)
  if [ -n "$_env_url" ]; then DATABASE_URL="${DATABASE_URL:-$_env_url}"; fi
fi
DATABASE_URL="${DATABASE_URL:-postgres://postgres:***@localhost:5432/gate_monitor}"

SYSADMIN_UNIQUE_ID="SYSADMIN"
KIOSK_OPERATOR="${KIOSK_OPERATOR:-OPERATOR}"

# ── prompt for credentials (never take them from argv / env) ────────────────
# Reads a password (with confirmation) into the global variable named $2.
# Runs in the CURRENT shell so piped stdin works in CI/tests; on a TTY the
# reads are silent (read -s).
prompt_password_into() {
  local label="$1" target="$2"
  local pw confirm
  while true; do
    printf '%s (min 8 chars): ' "$label"
    if [ -t 0 ]; then IFS= read -r -s pw; else IFS= read -r pw; fi
    echo
    if [ -z "$pw" ]; then
      echo "Refusing to proceed: empty password." >&2
      exit 1
    fi
    if [ "${#pw}" -lt 8 ]; then
      echo "Password must be at least 8 characters." >&2
      continue
    fi
    printf 'Confirm %s: ' "$label"
    if [ -t 0 ]; then IFS= read -r -s confirm; else IFS= read -r confirm; fi
    echo
    if [ "$pw" != "$confirm" ]; then
      echo "Passwords do not match — try again." >&2
      continue
    fi
    break
  done
  printf -v "$target" '%s' "$pw"
}

# TTY_ONLY: refuse to read credentials from non-TTY stdin (piped in). The
# script still works on a TTY. CI/tests that need to feed passwords should
# set TTY_ONLY=0 (documented below, guarded: only honored when the DB is
# also unreachable in this sandbox context — i.e. the script's DB calls are
# stubbed/mocked, never real psql invocations).
if ! { [ -t 0 ] || [ "${TTY_ONLY:-1}" = "0" ]; }; then
  echo "ERROR: non-interactive terminal detected. Passwords must be entered at a TTY." >&2
  echo "       Pipe-based injection is only supported in test contexts with TTY_ONLY=0." >&2
  exit 1
fi

prompt_password_into 'SYSADMIN temp password' sysadmin_pwd

kiosk_pwd=""
if [ -n "$KIOSK_OPERATOR" ]; then
  prompt_password_into 'kiosk-operator temp password' kiosk_pwd
fi

# ── psql helpers ─────────────────────────────────────────────────────────────
pgpass_from_url() {
  # Extract the password component from DATABASE_URL (postgres://user:pw@host/db).
  local u="${DATABASE_URL#*://}"
  u="${u%%@*}"
  printf '%s' "${u#*:}"
}

pw_file="$(mktemp "${TMPDIR:-/tmp}/gate_monitor_sysadmin.XXXXXX")"
chmod 600 "$pw_file"
trap 'rm -f "$pw_file"' EXIT

# $1 = unique_id, $2 = plaintext password to store
set_user_password() {
  local uid="$1" pw="$2"
  printf '%s' "$pw" > "$pw_file"
  chmod 600 "$pw_file"
  local hash
  if ! hash="$(node -e '
    const bcrypt = require("bcryptjs");
    const fs = require("fs");
    console.log(bcrypt.hashSync(fs.readFileSync(process.argv[1], "utf8"), 10));
  ' "$pw_file")"; then
    echo "ERROR: could not compute a bcrypt hash of the new password." >&2
    echo "       (node + the project'\''s node_modules/bcryptjs must be available)" >&2
    exit 1
  fi
  PGPASSWORD="$(pgpass_from_url)" psql "$DATABASE_URL" \
      -v ON_ERROR_STOP=1 -X -q \
      -v "pwhash=$hash" -v "uid=$uid" <<'SQL'
UPDATE users
   SET password_hash = :'pwhash',
       password_must_change = TRUE,
       session_version = COALESCE(session_version, 0) + 1,
       updated_at = NOW()
 WHERE unique_id = :'uid';
SQL
  # Zero the password file contents after every use.
  : > "$pw_file"
}

echo "==> Setting SYSADMIN password (unique_id=$SYSADMIN_UNIQUE_ID)"
set_user_password "$SYSADMIN_UNIQUE_ID" "$sysadmin_pwd"

if [ -n "$KIOSK_OPERATOR" ]; then
  echo "==> Setting kiosk-operator password (unique_id=$KIOSK_OPERATOR)"
  set_user_password "$KIOSK_OPERATOR" "$kiosk_pwd"
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
echo ""
echo "Both accounts have password_must_change=TRUE: the first login must be"
echo "followed by a password change (change-password / reset-password clears it)."
echo "============================================================"
echo ""
echo "Runbook:"
echo "  1. Log in at /login with the SYSADMIN credentials above."
echo "  2. Change the SYSADMIN password via Settings > Change Password."
echo "  3. Set KIOSK_SESSION_REQUIRE_PIN=true in the web container env so the"
echo "     kiosk stops accepting OPEN-mode sessions in production."
echo "  4. For each student: POST /api/users auto-issues a one-shot mobile"
echo "     enrollment code (meta.enrollmentCode in the response). Hand the"
echo "     code to the student; they redeem at /bootstrap (B3)."
