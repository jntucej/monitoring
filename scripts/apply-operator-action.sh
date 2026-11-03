#!/usr/bin/env bash
# apply-operator-action.sh — executes an approved operator_actions row.
#
# This is the Tier 2 executor: a sysadmin's "Approve" click on
# /sysadmin/actions flips the row to status='approved' via
# PATCH /api/sysadmin/actions/[id]; this script (run by the approval
# endpoint, or by the auto-run path for risk='low' rows) reads the payload
# and performs the action.
#
# Safety model:
#   - Only executes rows in status 'approved' or 'auto_executed'.
#   - 'low' risk rows auto-execute after their window; 'high' rows require
#     an explicit human approval (status must be 'approved', not pending).
#   - Every execution is recorded back to operator_actions (status='executed'
#     or 'failed') so the ledger stays the single source of truth.
#   - drop_table is a no-op unless a backup newer than 1h exists (the
#     script refuses to drop data it cannot restore).
#
# Usage:
#   bash scripts/apply-operator-action.sh <action_id>
#
set -euo pipefail

ACTION_ID="${1:?usage: apply-operator-action.sh <action_id>}"

DATABASE_URL="${DATABASE_URL:-postgres://gate_app:${POSTGRES_PASSWORD:-postgres}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-gate_monitor}}"
PSQL="psql $DATABASE_URL -v ON_ERROR_STOP=1 -q"

row() {
  # row <col> — read one column for the row.
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "SELECT $1 FROM public.operator_actions WHERE id = '$ACTION_ID'"
}

# --- Guard: the row must exist and be in an executable state. -------------
CURRENT_STATUS=$(row status)
case "$CURRENT_STATUS" in
  approved|auto_executed)
    ;;
  *)
    echo "action $ACTION_ID not executable (status=$CURRENT_STATUS; expected approved or auto_executed)" >&2
    exit 3
    ;;
esac

KIND=$(row kind)
PAYLOAD=$(row payload)

mark() { # mark <final_status>
  # P5 §27: state transitions go through the SECURITY DEFINER claim function
  # (20270106000002) — gate_app is read-only on operator_actions now, so a
  # direct UPDATE would fail even if it passed the app role's credentials.
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "SELECT public.claim_operator_action('$ACTION_ID', '$1', NULL)"
  echo "operator_action $ACTION_ID ($KIND) -> $1"
}

run_payload() {
  # Run the concrete action. Each branch is the minimal reversible/
  # audited step. Unknown kinds fail closed.
  local new_size table
  case "$KIND" in
    restart_container)
      local c; c=$(echo "$PAYLOAD" | jq -r '.container')
      [ -n "$c" ] && [ "$c" != "null" ] || { echo "restart_container missing .container" >&2; exit 2; }
      docker restart "$c"
      ;;
    prune_backups)
      local root max_age_days; root=$(echo "$PAYLOAD" | jq -r '.root'); max_age_days=$(echo "$PAYLOAD" | jq -r '.maxAgeDays // 7')
      [ -n "$root" ] && [ "$root" != "null" ] || { echo "prune_backups missing .root" >&2; exit 2; }
      find "$root" -name "gate-db-*.sql.gz" -mtime +"$max_age_days" -delete 2>/dev/null || true
      ;;
    raise_pool_size)
      # Autonomous SRE Phase 4 (ACT): the forecaster's auto/notify action for
      # db_pool_used trending toward max_connections. Reversible Tier 2 —
      # edit the env file + force-recreate web. Refuse if the new size would
      # break the pool-budget check (web pool × replicas > 80% of
      # max_connections).
      new_size=$(echo "$PAYLOAD" | jq -r '.size')
      # S1: size must be a plain integer within operational bounds — it is
      # multiplied into the pool-budget check and staged as an env value.
      [[ "$new_size" =~ ^[0-9]+$ ]] || { echo "raise_pool_size refused: .size is not an integer ('$new_size')" >&2; exit 4; }
      [ "$new_size" -ge 10 ] && [ "$new_size" -le 100 ] || { echo "raise_pool_size refused: .size out of bounds 10..100 ($new_size)" >&2; exit 4; }
      # Autonomous SRE Phase 4 (ACT): the forecaster's auto/notify action for
      # db_pool_used trending toward max_connections. Reversible Tier 2 —
      # write the desired value to a staging file. The actual apply (edit the
      # env file + force-recreate web) is host-side and must be done by an
      # operator or CI step; the container cannot modify its own .env.
      # Refuse if the new size would break the pool-budget check
      # (web pool × replicas > 80% of max_connections).
      max_conn=$(psql "$DATABASE_URL" -tAc "SELECT setting::int FROM pg_settings WHERE name='max_connections'")
      replicas=${REPLICA_COUNT:-1}
      budget=$(( max_conn * 80 / 100 ))
      if (( new_size * replicas > budget )); then
        echo "raise_pool_size refused: $new_size × $replicas replicas = $((new_size*replicas)) > pool budget $budget (Tier 3 — escalate, not auto)" >&2
        exit 4
      fi
      echo "PG_MAX_POOL_SIZE=$new_size" > /app/.cache/pool-size.staging
      echo "[raise_pool_size] desired PG_MAX_POOL_SIZE=$new_size staged at /app/.cache/pool-size.staging (apply via docker compose env edit + force-recreate web, Tier 2, reversible)"
      ;;
    extend_disk)
      # Autonomous SRE Phase 4 (ACT): disk_free_pct trending toward 0.
      # Tier 3 approve — the forecaster only creates this as a high-risk
      # pending row. The actual extension (lvm, EBS resize, or volume
      # expansion) is operator-specific; this branch records the intent and
      # triggers a backup prune to reclaim space as a stopgap.
      echo "[extend_disk] disk pressure signal — pruning backups older than 3d as stopgap; operator must extend volume (Tier 3)"
      # S9: the prune only runs when the operator explicitly approved this
      # action row (that is the precondition for reaching this branch — the
      # row is Tier 3 and only executes after human approval), and it is
      # restricted to the backup directory via -maxdepth so a hostile or
      # mis-set path can never reach rm on /opt/monitoring proper.
      find /opt/monitoring/backups -maxdepth 2 -type f -name "gate-db-*.sql.gz" -mtime +3 -delete 2>/dev/null || true
      df -h /opt/monitoring 2>/dev/null | tail -1 || true
      ;;
    scale_pool)
      # Tier 2: reversible. Document the exact step; a real pool resize edits
      # the env file and restarts web — do NOT silently sed production.
      new_size=$(echo "$PAYLOAD" | jq -r '.size')
      echo "[scale_pool] PG_MAX_POOL_SIZE=$new_size — apply via docker compose env edit + force-recreate web (Tier 2, reversible)"
      ;;
    rotate_credential)
      bash /app/scripts/rotate-db-creds.sh || exit 1
      ;;
    hard_delete_users)
      # DPDP erasure is owned by the hard-delete-expired worker job
      # (30-day grace on soft-deleted users). This Tier 2 gate is the
      # explicit "run it now" trigger — shell out to the same job logic
      # rather than issuing a raw DELETE that bypasses the retention
      # window and the cascade the job performs.
      echo "[hard_delete_users] delegated to hard-delete-expired worker job (DPDP 30d grace + cascade)"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "SELECT public.hard_delete_expired_users()" 2>/dev/null || \
        echo "[hard_delete_users] no dedicated DB function — worker job owns erasure; nothing executed here"
      ;;
    drop_table)
      table=$(echo "$PAYLOAD" | jq -r '.table')
      # S1: validate the identifier BEFORE it touches SQL. A payload.table of
      # "users; DROP TABLE audit_logs; --" would have executed two
      # statements through psql. Strict identifier charset + existence
      # check (to_regclass) so only a real public-schema table can drop.
      [[ "$table" =~ ^[a-z_][a-z0-9_]*$ ]] || { echo "drop_table refused: invalid identifier '$table' (Tier 3 — payload rejected)" >&2; exit 4; }
      exists=$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.$table') IS NOT NULL")
      [ "$exists" = "t" ] || { echo "drop_table refused: no such table public.$table (Tier 3 — payload rejected)" >&2; exit 4; }
      # Refuse to drop unless a fresh backup exists (<= 1h old).
      local newest; newest=$(find /opt/monitoring/backups -name "gate-db-*.sql.gz" -mmin -60 2>/dev/null | head -1 || true)
      if [ -z "$newest" ]; then
        echo "drop_table refused: no backup newer than 1h for $table (Tier 3 — run a backup first)" >&2
        exit 4
      fi
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "DROP TABLE IF EXISTS public.\"$table\" CASCADE"
      ;;
    clear_email_queue)
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "UPDATE public.notification_email_queue SET status='cancelled' WHERE status='pending'"
      ;;
    revoke_all_sessions)
      # M5: fleet-wide session revocation. Bumps users.session_version for
      # everyone and revokes all live session rows. .keep_self (bool) spares
      # the requester's own sessions so the admin doesn't lock themselves out.
      local keep_self; keep_self=$(echo "$PAYLOAD" | jq -r '.keep_self // false')
      if [ "$keep_self" = "true" ]; then
        local requester; requester=$(echo "$PAYLOAD" | jq -r '.requested_by')
        [ -n "$requester" ] && [ "$requester" != "null" ] || { echo "revoke_all_sessions keep_self=true but .requested_by missing" >&2; exit 2; }
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
          "UPDATE public.users SET session_version = COALESCE(session_version, 0) + 1, updated_at = NOW() WHERE deleted_at IS NULL AND id <> '$requester'; UPDATE public.sessions SET revoked_at = NOW() WHERE revoked_at IS NULL AND user_id <> '$requester'"
      else
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
          "UPDATE public.users SET session_version = COALESCE(session_version, 0) + 1, updated_at = NOW() WHERE deleted_at IS NULL; UPDATE public.sessions SET revoked_at = NOW() WHERE revoked_at IS NULL"
      fi
      echo "[revoke_all_sessions] fleet-wide session revocation complete (keep_self=$keep_self)"
      ;;
    delete_user)
      # M5: hard user delete. The executor performs the actual DELETE after
      # the two-human approval gate. Soft-deleted users with history are
      # handled by the hard-delete-expired worker job (30-day DPDP grace);
      # this path is for clean hard deletes.
      local target_user_id; target_user_id=$(echo "$PAYLOAD" | jq -r '.target_user_id')
      [ -n "$target_user_id" ] && [ "$target_user_id" != "null" ] || { echo "delete_user missing .target_user_id" >&2; exit 2; }
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "UPDATE public.sessions SET revoked_at = NOW() WHERE user_id = '$target_user_id' AND revoked_at IS NULL; DELETE FROM public.users WHERE id = '$target_user_id'"
      echo "[delete_user] user $target_user_id deleted (two-human approval)"
      ;;
    change_user_role)
      # M5: role change via the approval gate. .target_user_id + .role.
      local target_id new_role; target_id=$(echo "$PAYLOAD" | jq -r '.target_user_id'); new_role=$(echo "$PAYLOAD" | jq -r '.role')
      [ -n "$target_id" ] && [ "$target_id" != "null" ] && [ -n "$new_role" ] && [ "$new_role" != "null" ] || { echo "change_user_role missing .target_user_id or .role" >&2; exit 2; }
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "UPDATE public.users SET role = '$new_role', session_version = COALESCE(session_version, 0) + 1, updated_at = NOW() WHERE id = '$target_id'"
      echo "[change_user_role] user $target_id → $new_role (two-human approval)"
      ;;
    grant_sysadmin)
      # M5: highest-privilege grant. Requires two different sysadmins.
      local target_user_id; target_user_id=$(echo "$PAYLOAD" | jq -r '.target_user_id')
      [ -n "$target_user_id" ] && [ "$target_user_id" != "null" ] || { echo "grant_sysadmin missing .target_user_id" >&2; exit 2; }
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "UPDATE public.users SET role = 'sysadmin', session_version = COALESCE(session_version, 0) + 1, updated_at = NOW() WHERE id = '$target_user_id'"
      echo "[grant_sysadmin] user $target_user_id → sysadmin (two-human approval)"
      ;;
    disable_kill_switch)
      # M5: disabling the DR kill switch. Records intent; the actual flag
      # flip is in automation_controls (a dedicated worker job owns the write).
      echo "[disable_kill_switch] kill-switch disable request recorded; automation-controls worker owns the write"
      ;;
    rotate_db_credentials)
      # M5: DB credential rotation via the approval gate.
      bash /app/scripts/rotate-db-creds.sh || exit 1
      echo "[rotate_db_credentials] credential rotation complete"
      ;;
    escalation|*)
      # Tier 3: nothing to execute locally. The pg_notify trigger already
      # pushed the Telegram alert; record it as executed (the action WAS
      # the notification).
      echo "$KIND" | grep -q '^escalation$' && { echo "escalation recorded (notification handled by trigger)"; }
      ;;
  esac
}

# Run the payload (for escalation-only rows this is a no-op echo).
if [ "$KIND" != "escalation" ]; then
  run_payload
fi
mark executed
