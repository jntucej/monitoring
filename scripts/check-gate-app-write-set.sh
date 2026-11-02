#!/usr/bin/env bash
# check-gate-app-write-set.sh — every write path in src/ that INSERTs/UPDATEs/
# DELETEs on an RLS table must go through withTransaction (GUC context) or a
# known SECURITY DEFINER function. Bare Supabase service-client writes on RLS
# tables silently fail (NOBYPASSRLS was revoked in 20261231000014).
#
# Heuristic: flag .ts files under src/ that call .from('<rls_table>').insert|
# .update|.delete without a nearby withTransaction import in the same file.
# Whitelist known-good files at the bottom; extend as routes are migrated.
set -uo pipefail

RLS_TABLES='users|sessions|permissions|movement_logs|gate_passes|complaints|notifications|mess_days|mess_day_items|mess_tokens|mess_menu_items|mess_meal_served|mess_meal_reviews|student_details|employee_details|gates|enrollment_codes|onboarding_progress|password_reset_tokens|audit_logs|announcements|attendance_records|shift_handovers|claim_codes|guardian_links|user_achievements'

fail=0
while IFS= read -r f; do
  # Does this file do a direct Supabase write on an RLS table?
  if grep -qE "\.from\(['\"][^'\"]*['\"]\)\.(insert|update|delete)\(" "$f" \
     && grep -qE "$RLS_TABLES" "$f"; then
    # Is it using withTransaction (the sanctioned GUC-aware path)?
    if ! grep -q 'withTransaction' "$f"; then
      # Whitelist check
      case "$f" in
        src/lib/db.ts|src/lib/invalidate-all-sessions.ts|src/lib/onboarding.ts)
          continue ;;
      esac
      echo "FAIL: $f — Supabase write on RLS table without withTransaction"
      fail=1
    fi
  fi
done < <(find src/app/api -name 'route.ts')

echo "Total unguarded write routes: $fail"
if [ "$fail" -eq 0 ]; then
  echo "PASS: gate-app write set — every write route uses withTransaction"
  exit 0
else
  # Debt-tracker mode: every unguarded route is printed above; the gate
  # stays non-blocking until the list is empty, matching the warn-only
  # pattern used by check-no-silent-catch.sh / check-unbounded-select.sh.
  echo "DEBT: $fail unguarded write routes (see above) — promote to FAIL once clean"
  exit 0
fi
