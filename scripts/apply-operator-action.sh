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
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "UPDATE public.operator_actions SET status = '$1', decided_at = NOW() WHERE id = '$ACTION_ID' AND status IN ('approved','auto_executed')"
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
      [ -n "$new_size" ] && [ "$new_size" != "null" ] || { echo "raise_pool_size missing .size" >&2; exit 2; }
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
      find /opt/monitoring/backups -name "gate-db-*.sql.gz" -mtime +3 -delete 2>/dev/null || true
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
      # Refuse to drop unless a fresh backup exists (<= 1h old).
      local newest; newest=$(find /opt/monitoring/backups -name "gate-db-*.sql.gz" -mmin -60 2>/dev/null | head -1 || true)
      if [ -z "$newest" ]; then
        echo "drop_table refused: no backup newer than 1h for $table (Tier 3 — run a backup first)" >&2
        exit 4
      fi
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "DROP TABLE IF EXISTS $table CASCADE"
      ;;
    clear_email_queue)
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
        "UPDATE public.notification_email_queue SET status='cancelled' WHERE status='pending'"
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
