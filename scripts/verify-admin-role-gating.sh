#!/usr/bin/env bash
# Asserts identified destructive API endpoints are covered by SYSADMIN_ONLY gating.
set -euo pipefail

# List of API routes that must be SYSADMIN_ONLY
# Based on the requirement: "Apply requiredRole: SYSADMIN_ONLY to the 12 identified destructive API endpoints."
ROUTES=(
  "monitoring/src/app/api/sysadmin/backup/route.ts"
  "monitoring/src/app/api/sysadmin/backup/restore/route.ts"
  "monitoring/src/app/api/sysadmin/compliance/anonymize/route.ts"
  "monitoring/src/app/api/sysadmin/compliance/export/route.ts"
  "monitoring/src/app/api/sysadmin/ldap/sync/route.ts"
  "monitoring/src/app/api/sysadmin/retention/run/route.ts"
  "monitoring/src/app/api/sysadmin/role-requests/[id]/route.ts"
  "monitoring/src/app/api/sysadmin/security/ip-allowlist/route.ts"
  "monitoring/src/app/api/sysadmin/sessions/[id]/route.ts"
  "monitoring/src/app/api/sysadmin/sso/route.ts"
  "monitoring/src/app/api/sysadmin/jobs/[id]/run/route.ts"
  "monitoring/src/app/api/sysadmin/jobs/[id]/route.ts"
)

FAILED=0

for route in "${ROUTES[@]}"; do
  if [ ! -f "$route" ]; then
    echo "Error: Route file not found: $route"
    FAILED=1
    continue
  fi

  # Check if the file contains the SYSADMIN_ONLY requirement
  if ! grep -q "requiredRole: SYSADMIN_ONLY" "$route"; then
    echo "FAIL: $route is not gated with SYSADMIN_ONLY"
    FAILED=1
  fi
done

if [ $FAILED -eq 1 ]; then
  echo "Verification failed: Some routes are missing SYSADMIN_ONLY gating."
  exit 1
fi

echo "OK: All ${#ROUTES[@]} destructive routes are correctly gated."
