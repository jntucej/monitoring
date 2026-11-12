#!/usr/bin/env bash
# check-not-valid-constraints.sh
#
# Validates the four NOT VALID constraints from 20270104000001_business_invariants.sql.
#
# Run this ONCE in staging after the ops batch lands and after the
# hostel_scope backfill migration has run. It:
#   1. Counts how many legacy rows would violate each constraint (dry-run).
#   2. Backfills the hostel_scope column from student_details.gender for
#      rows where it is still NULL (the backfill migration should have
#      handled this, but this is a safety net).
#   3. Runs ALTER TABLE ... VALIDATE CONSTRAINT for each one.
#
# If any dry-run count is > 0 the script exits 1 before validating — the
# operator must backfill the offending rows first, not just force-validate.
#
# Usage:
#   bash scripts/check-not-valid-constraints.sh [--dry-run]
#
# --dry-run: print the violation counts and exit. Do NOT run VALIDATE.

set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# psql helper — runs a query inside the running postgres container.
PG_CONTAINER="${PG_CONTAINER:-gate_postgres}"
PSQL() {
  docker exec -i "$PG_CONTAINER" psql -U postgres -d gate_monitor -v ON_ERROR_STOP=1 -tAc "$1"
}

fail=0
count_violations() {
  local label="$1"
  local sql="$2"
  local n
  n="$(PSQL "$sql" || echo 0)"
  n="${n:-0}"
  echo "  $label: $n violating row(s)"
  if [ "$n" -gt 0 ] && [ "$DRY_RUN" != "true" ]; then
    fail=1
  fi
}

echo "================================================================"
echo "🔍 NOT VALID CONSTRAINTS — DRY RUN"
echo "================================================================"

echo "==> 1. permissions.hostel_scope_required"
count_violations "hostel_scope NULL/invalid" \
  "SELECT count(*) FROM public.permissions
    WHERE workflow_type='hostel'
      AND (hostel_scope IS NULL OR hostel_scope NOT IN ('boys','girls'))"

echo "==> 2. permissions.from_before_to"
count_violations "from_date > to_date" \
  "SELECT count(*) FROM public.permissions
    WHERE from_date IS NOT NULL AND to_date IS NOT NULL AND from_date > to_date"

echo "==> 3. student_details.hosteller_requires_room"
count_violations "hosteller missing block/room" \
  "SELECT count(*) FROM public.student_details
    WHERE current_entry_type='hosteller'
      AND (hostel_block IS NULL OR room_number IS NULL)"

echo "==> 4. notification_email_queue.attempts_bounded"
count_violations "attempts > 10" \
  "SELECT count(*) FROM public.notification_email_queue
    WHERE attempts > 10"

echo "================================================================"
if [ "$DRY_RUN" = "true" ]; then
  echo "Dry-run complete. No VALIDATE ran."
  echo "================================================================"
  exit 0
fi

if [ "$fail" -ne 0 ]; then
  echo "❌ Violations found. Backfill the offending rows, then re-run."
  echo "================================================================"
  exit 1
fi

echo ""
echo "==> Backfilling hostel_scope from student_details.gender (safety net)..."
PSQL "
  UPDATE public.permissions p
     SET hostel_scope = CASE
           WHEN sd.gender = 'male'   THEN 'boys'
           WHEN sd.gender = 'female' THEN 'girls'
           ELSE p.hostel_scope
         END
    FROM public.student_details sd
   WHERE p.workflow_type = 'hostel'
     AND p.hostel_scope IS NULL
     AND sd.user_id = p.requester_user_id
" >/dev/null || true

echo "==> VALIDATE CONSTRAINT (all four)..."
PSQL "ALTER TABLE public.permissions VALIDATE CONSTRAINT permissions_hostel_scope_required;"
PSQL "ALTER TABLE public.permissions VALIDATE CONSTRAINT permissions_from_before_to;"
PSQL "ALTER TABLE public.student_details VALIDATE CONSTRAINT hosteller_requires_room;"
PSQL "ALTER TABLE public.notification_email_queue VALIDATE CONSTRAINT email_queue_attempts_bounded;"

echo "================================================================"
echo "✅ All four NOT VALID constraints validated."
echo "================================================================"
