#!/usr/bin/env bash
# Part 6 — path traversal + upload probes against the live stack.
# Exits 0 only if every probe returns the expected code.
set -uo pipefail

BASE="${SMOKE_BASE:-http://127.0.0.1:80}"
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "[PASS] $desc → $actual"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $desc → got $actual, expected $expected"
    FAIL=$((FAIL+1))
  fi
}

# The permission document route requires auth. Traversal probes that don't
# match the allowlist must fail at 400 (invalid ticket) BEFORE the DB lookup.
# 401 (unauthenticated) is also acceptable as a pass when the ticket is
# well-formed but the caller lacks access; the security property under test
# is: no 200 / no 404-leak of the file contents.

# 1. Percent-encoded ../ → 400 (allowlist rejects)
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/..%2F..%2F..%2F.env/document")
check "encoded traversal (..%2F..%2F)" "400" "$code"

# 2. Double-encoded
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/%252e%252e%252f.env/document")
check "double-encoded traversal" "400" "$code"

# 3. Plain dot-dot with trailing slashes
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/....//.env/document")
check "....// prefix" "400" "$code"

# 4. NUL byte
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/HP-2026-0000%00evil/document")
check "NUL byte in ticket" "400" "$code"

# 5. Absolute path attempt
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/%2Fetc%2Fpasswd/document")
check "absolute-path ticket" "400" "$code"

# 6. Backslash
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/HP-2026%5C2026-0001/document")
check "backslash segment" "400" "$code"

# 7. Bidi override
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/HP-2026-0000%2f..%2f..%2fetc%2fpasswd/document")
check "encoded .. (..%2f)" "400" "$code"

# 8. Well-formed ticket, no auth → 401 (proves the route is alive and the
#    400s above are allowlist rejections, not missing routes).
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/HP-2026-0001/document")
check "well-formed ticket unauthenticated" "401" "$code"

# 9. Overlong ticket (>64 chars) → 400
LONG=$(python3 -c "print('A'*80)")
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/permissions/$LONG/document")
check "overlong ticket" "400" "$code"

echo
echo "Traversal probes: $PASS passed, $FAIL failed"
exit $FAIL
