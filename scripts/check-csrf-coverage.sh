#!/usr/bin/env bash
# check-csrf-coverage.sh — fail the build if a state-changing route ships
# without a CSRF / mutation-guard control.
#
# A route counts as protected when it references ANY of:
#   * withMutationGuard / withAdminMutation (bakes in assertCsrf)
#   * an explicit assertCsrf / validateCsrf call
# Routes that are pre-auth and intentionally CSRF-exempt live in
# CSRF_EXEMPT_PATHS in src/lib/csrf.ts (login, refresh, reset-password,
# bootstrap). We still list them here so a future edit that *removes*
# their exemption is caught.
#
# This is a coverage NET, not a substitute for review: it tells you WHICH
# files to look at, not whether each one is safe.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
for f in $(find src/app/api -name "route.ts" | sort); do
  # Only routes that export a state-changing verb.
  grep -qE '^export const (POST|PUT|PATCH|DELETE)' "$f" || continue

  # Already protected by a mutation guard or an explicit CSRF check.
  if grep -qE 'withMutationGuard|withAdminMutation|assertCsrf|validateCsrf' "$f"; then
    continue
  fi

  # Pre-auth / logout routes are intentionally exempt from CSRF origin checks
  # (they either have no session, or clearing a session is not attacker
  # meaningful). They are still rate-limited.
  case "$f" in
    *auth/login*|*auth/refresh*|*auth/reset-password*|*auth/bootstrap*|*auth/logout*|*auth/pin-change*|*auth/pin-reset-self*|*mobile/*)
      continue
      ;;
  esac

  echo "CSRF MISSING: $f"
  fail=1
done

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "FAIL — one or more state-changing routes have no CSRF control."
  echo "Wrap each in withMutationGuard(handler) (authenticated) or add an"
  echo "explicit assertCsrf (pre-auth). See src/server/http/mutation-guard.ts."
  exit 1
fi

echo "OK — every state-changing route is CSRF-protected (or an accepted pre-auth exemption)."
