#!/usr/bin/env bash
# check-csrf-coverage.sh — fail the build if a state-changing route ships
# without a CSRF / mutation-guard control.
#
# P2 hardening: a route counts as protected only when it either
#   * calls a guard factory (withMutationGuard / withAdminMutation /
#     withMessMutation) that bakes in assertCsrf, or
#   * imports assertCsrf/validateCsrf AND actually calls it (import alone
#     no longer passes — an import that is never invoked was the old
#     false-negative).
# Pre-auth and webhook routes are exempted by path; webhook secret
# checking is enforced by check-security.sh instead.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
scanned=0

for f in $(find src/app/api -name "route.ts" | sort); do
  # Only routes that export a state-changing verb (const or function form).
  if ! grep -qE '^export const (POST|PUT|PATCH|DELETE)|^export async function (POST|PUT|PATCH|DELETE)' "$f"; then
    continue
  fi
  scanned=$((scanned+1))

  # Accepted exemptions: pre-auth routes (no session, or clearing it is not
  # attacker-meaningful) and the MSG91 delivery webhook (HMAC-secret
  # guarded, verified by check-security.sh).
  case "$f" in
    *auth/login*|*auth/refresh*|*auth/reset-password*|*auth/bootstrap*|*auth/logout*|*auth/pin-change*|*auth/pin-reset-self*|*auth/passkey*|*auth/_drill*|*webhooks/sms*|*webhooks/alertmanager*|*api/cron/*|*dev/contact*|*device-push*|*mobile/login*|*mobile/*|*sysadmin/drills*)
      continue
      ;;
  esac

  # Wrapped in a guard factory that calls assertCsrf internally.
  if grep -qE '\b(withMutationGuard|withAdminMutation|withMessMutation)\s*\(' "$f"; then
    continue
  fi

  # Direct call — must have both the import AND a call site.
  if grep -qE 'import[^;]*\b(assertCsrf|validateCsrf)\b' "$f" \
     && grep -qE '\b(assertCsrf|validateCsrf)\s*\(' "$f"; then
    continue
  fi

  echo "CSRF MISSING: $f"
  fail=1
done

echo ""
echo "Scanned $scanned mutation routes, skipped pre-auth/webhook exemptions."
if [ "$fail" -eq 1 ]; then
  echo "FAIL — one or more state-changing routes have no CSRF control."
  echo "Fix: wrap in withMutationGuard(handler) or withAdminMutation(handler)."
  exit 1
fi
echo "OK — every state-changing route is CSRF-protected (or an accepted exemption)."
