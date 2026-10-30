#!/usr/bin/env bash
# scripts/check-no-mock-in-prod.sh
# Verifies that deployment manifests, Dockerfiles, and compose files do not enable synthetic mock analytics in production.
set -euo pipefail

echo "=== Verifying No Synthetic Mock Analytics in Production Configuration ==="

FAILS=0

# Check deployment manifests and compose files
for f in k8s/*.yaml docker-compose*.yml Dockerfile; do
  [ -f "$f" ] || continue
  if grep -iE "ENABLE_MOCK_ANALYTICS\s*[:=]\s*['\"]?(true|1)['\"]?" "$f" 2>/dev/null; then
    echo "❌ FAIL: $f sets ENABLE_MOCK_ANALYTICS=true in deployment artifact!" >&2
    FAILS=$((FAILS + 1))
  fi
  if grep -iE "NEXT_PUBLIC_MOCK_ANALYTICS\s*[:=]\s*['\"]?(true|1)['\"]?" "$f" 2>/dev/null; then
    echo "❌ FAIL: $f sets NEXT_PUBLIC_MOCK_ANALYTICS=true in deployment artifact!" >&2
    FAILS=$((FAILS + 1))
  fi
done

if [ "$FAILS" -gt 0 ]; then
  echo "Production mock analytics guard FAILED!" >&2
  exit 1
fi

echo "✓ Verified: No deployment manifests enable mock analytics in production."
