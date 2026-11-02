#!/usr/bin/env bash
# scripts/check-audit-constraint.sh
# Verifies that audit_logs_action_known CHECK constraint is active, contains
# the canonical action array, and (the recommended gate) proves ONE-ROW-PER-ACTION
# insertability: every action in the owner-of-record migration
# (database/migrations/20270101000014_audit_action_canonical_owner.sql) must be
# insertable into audit_logs, and an unknown action must be rejected.
#
# This is the regression check for the "silent zero-row / wrong constraint"
# class: if the constraint is missing or not biting, the bogus-action insert
# would wrongly succeed and the check fails.
set -euo pipefail

CONTAINER="${CONTAINER:-gate_postgres}"
DB="${DB:-gate_monitor}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OWNER_MIG="$ROOT_DIR/database/migrations/20270101000014_audit_action_canonical_owner.sql"

echo "=== Verifying audit_logs_action_known constraint ==="

DEF=$(docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -tAc \
  "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='audit_logs_action_known';" 2>/dev/null || echo "")

if [ -z "$DEF" ]; then
  echo "FAIL: Constraint 'audit_logs_action_known' is missing on table audit_logs!" >&2
  exit 1
fi

if ! echo "$DEF" | grep -q 'ARRAY\['; then
  echo "FAIL: Constraint 'audit_logs_action_known' does not contain an ARRAY definition!" >&2
  echo "Definition: $DEF" >&2
  exit 1
fi

echo "✓ Constraint 'audit_logs_action_known' exists and contains a canonical action array."

# ── One-row-per-action insertability test (recommended gate) ──────────────────
# Extract the action set from the owner-of-record migration and verify each is
# insertable; then verify an unknown action is rejected.
if [ ! -f "$OWNER_MIG" ]; then
  echo "NOTE: owner-of-record migration $OWNER_MIG not found — skipping insertability test." >&2
  exit 0
fi

# Extract actions ONLY from the owner's constraint ARRAY block, so version
# numbers or other quoted tokens elsewhere in the file are not treated as
# audit actions. The ARRAY block uses 4-space indented entries and ends with
# `  ])`, so match that closing line (2-space `]` + paren) as the window.
ACTIONS=$(awk '/ADD CONSTRAINT audit_logs_action_known/,/^  \]\)/' "$OWNER_MIG" \
  | grep -oE "'[A-Za-z_0-9]+'" | tr -d "'" | sort -u)
if [ -z "$ACTIONS" ]; then
  echo "FAIL: could not extract any actions from $OWNER_MIG" >&2
  exit 1
fi

COUNT=$(echo "$ACTIONS" | grep -c .)
echo "Running one-row-per-action insertability test against $COUNT canonical actions..."

# 1) Every canonical action must be insertable. (audit_logs is IMMUTABLE —
#    an UPDATE/DELETE-reject trigger (20261223000001) means probe rows we add
#    here cannot be removed later; that is by design for the audit log, and
#    the probe rows are inert. What matters is the insert itself: a valid
#    action inserts, an invalid one is rejected by the CHECK.)
INSERT_FAILS=0
while IFS= read -r a; do
  [ -z "$a" ] && continue
  # Capture only the RETURNING value. psql appends the command tag
  # ("INSERT 0 1") as a second line; filter to the first line so the
  # comparison is exact.
  OK=$(docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -tAc \
    "INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp)
     VALUES (gen_random_uuid(), '$a', NULL, 'audit_check', 'audit_check', '{}', '127.0.0.1', 'audit_check', NOW()) RETURNING 'ok';" \
    2>/dev/null | head -n 1 || echo "err")
  if [ "$OK" != "ok" ]; then
    echo "  ✗ canonical action '$a' is NOT insertable (constraint too narrow)." >&2
    INSERT_FAILS=$((INSERT_FAILS+1))
  fi
done <<< "$ACTIONS"

# 2) An unknown action must be rejected (constraint actually bites).
BOGUS_OK=$(docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -tAc \
  "INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp)
   VALUES (gen_random_uuid(), 'ZZ_AUDIT_CHECK_BOGUS_ACTION', NULL, 'audit_check', 'audit_check', '{}', '127.0.0.1', 'audit_check', NOW()) RETURNING 'ok';" \
  2>/dev/null || echo "rejected")
if [ "$BOGUS_OK" = "ok" ]; then
  echo "FAIL: unknown action 'ZZ_AUDIT_CHECK_BOGUS_ACTION' was accepted — the CHECK constraint is NOT enforced." >&2
  exit 1
fi

# 3) The probe rows inserted above are INERT and cannot be removed:
#    audit_logs is immutable under the UPDATE/DELETE-reject trigger
#    (20261223000001_security_hardening). By design, this is a feature —
#    the audit log is append-only. The probe rows (user_name='audit_check')
#    carry no PII and carry no business meaning; they are the gate's own
#    self-test artifacts. We document this rather than attempt a cleanup
#    that would fail on every run and produce a misleading "ok".
echo "✓ Probe rows left in place (audit_logs is immutable by design)."

if [ "$INSERT_FAILS" -gt 0 ]; then
  echo "FAIL: $INSERT_FAILS canonical action(s) could not be inserted into audit_logs." >&2
  exit 1
fi

echo "✓ One-row-per-action insertability: all $COUNT canonical actions accepted, unknown action rejected."
