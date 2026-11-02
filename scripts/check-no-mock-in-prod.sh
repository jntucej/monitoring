#!/usr/bin/env bash
# P12: mock-in-prod guard — covers ALL four mock env vars across every
# deployment artifact. The old version only checked two vars in two files;
# NEXT_PUBLIC_WS_MOCK / NEXT_PUBLIC_ALLOW_MOCK_WS were documented in
# .env.example but never guarded, so fabricated scan data could ship.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "=== Verifying No Synthetic Mock Analytics in Production Configuration ==="
FAILS=0

for v in ENABLE_MOCK_ANALYTICS NEXT_PUBLIC_MOCK_ANALYTICS NEXT_PUBLIC_WS_MOCK NEXT_PUBLIC_ALLOW_MOCK_WS; do
  for f in docker-compose.yml docker-compose*.yml Dockerfile k8s/*.yaml compose/*.yml; do
    [ -f "$f" ] || continue
    # Flag any deployment artifact that sets the var to true/1
    if grep -qE "^${v}[[:space:]]*[:=][[:space:]]*['\"]?(true|1)" "$f" 2>/dev/null; then
      echo "❌ FAIL: $f sets ${v}=true in a deployment artifact!" >&2
      FAILS=$((FAILS + 1))
    fi
    # Also catch ${VAR:-true} and ${VAR:-1} fallback patterns
    if grep -qE "\\\$\{${v}:-?(true|1)\}" "$f" 2>/dev/null; then
      echo "❌ FAIL: $f defaults ${v} to true/1 via \${${v}:-...}!" >&2
      FAILS=$((FAILS + 1))
    fi
  done
done

if [ "$FAILS" -gt 0 ]; then
  echo "FAIL — $FAILS deployment artifact(s) enable mock data." >&2
  exit 1
fi
echo "✓ Verified: No deployment manifests enable mock analytics in production."
