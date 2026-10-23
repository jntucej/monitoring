#!/usr/bin/env bash
# check-role-scoping.sh
#
# Trust-model guard: the app connects to Postgres as `postgres`, which has
# BYPASSRLS=TRUE, so the 200+ RLS policies in the schema are NOT enforced
# for application queries. Role isolation is enforced entirely by the
# `auth.userId` / `auth.role` scoping in each API route's WHERE clause.
#
# This check catches the class of bug that the database will NOT catch for
# you: a route that issues a SELECT with no scoping predicate at all.
#
# It is intentionally crude (static analysis of the SQL literal), so it only
# flags the most dangerous pattern — `SELECT * FROM <sensitive_table>` with
# no WHERE — rather than trying to model every join/correlated subquery.
# It exists to make the gap in the trust model visible in CI, not to replace
# a review of the actual scoping logic in each handler.
#
# Exit codes:
#   0  clean
#   1  flagged (review required)
#   2  usage / tooling error
set -uo pipefail
cd "$(dirname "$0")/.."

# Tables where an unscoped read would leak cross-role PII / state.
SENSITIVE_TABLES='users|student_details|employee_details|permissions|gate_passes|movement_logs|campus_occupancy|sessions|audit_logs|complaints|mess_tokens|visitor_logs'

echo "==> Scanning src/app/api/ for unscoped SELECTs on sensitive tables"
fail=0

# Pass 1: every SELECT * FROM <sensitive> must have a WHERE close by.
# (auth/login's SELECT * is the identifier lookup — it is scoped by $1, so
# it's already safe; only flag when no WHERE appears in the whole file.)
hits=$(grep -rEn "SELECT[[:space:]]+\\\\*[^\"']*(FROM|from)[[:space:]]+(public\\\\.)?(${SENSITIVE_TABLES})" src/app/api/ --include="*.ts" 2>/dev/null | grep -v "WHERE\|where" || true)
if [ -n "$hits" ]; then
  while IFS= read -r hit; do
    file="${hit%%:*}"
    # strip leading "file:line:"
    line="${hit#*:}"; line="${line%%:*}"
    # If ANY WHERE appears anywhere in the file, assume the query is scoped
    # (the file is the unit a reviewer actually looks at). Only flag files
    # with no WHERE at all.
    if ! grep -q "WHERE\|where" "$file"; then
      echo "  FLAG  $file:$line  unscoped SELECT * — add a role-scoping WHERE (auth.userId / auth.role / \$N)"
      fail=1
    fi
  done <<< "$hits"
fi

# Pass 2: any route that reads a sensitive table but has no auth wiring at all.
# Exclude helper modules and public (pre-auth) routes — those are not
# per-caller scoped by design (reset-password validates a token, home/live
# is intentionally public, _helpers is imported by scoped routes).
readers=$(grep -rEl "(FROM|from)[[:space:]]+(public\\\\.)?(${SENSITIVE_TABLES})[[:space:]()]?" src/app/api/ --include="*.ts" 2>/dev/null || true)
if [ -n "$readers" ]; then
  while IFS= read -r f; do
    case "$f" in
      src/app/api/mess/_helpers.ts|src/app/api/home/*|src/app/api/auth/reset-password/*|src/app/api/cron/*) continue ;;
    esac
    if ! grep -q "auth\.\|getAuthenticatedUser\|withAuthorization\|req\.headers" "$f"; then
      echo "  FLAG  $f  reads a sensitive table but has no auth wiring"
      fail=1
    fi
  done <<< "$readers"
fi

if [ "$fail" -eq 0 ]; then
  echo "  ✓ no unscoped sensitive-table reads found"
  exit 0
fi
echo
echo "❌ Role-scoping gaps found. RLS does NOT protect the app role (BYPASSRLS) —"
echo "   each flagged query must carry an explicit scoping WHERE clause."
exit 1
