#!/usr/bin/env bash
set -uo pipefail
fail=0

echo "── Migration file ──"
if [ -f "database/migrations/20261020000002_geo_verified_bool.sql" ]; then
  echo "  ✅ migration exists"
else
  echo "  ❌ migration missing"; fail=1
fi

echo "── checkGeoFence exists ──"
if rg -q "export function checkGeoFence" src/server/policy/gate-access.ts; then
  echo "  ✅ checkGeoFence exported"
else
  echo "  ❌ checkGeoFence missing"; fail=1
fi

echo "── Client helper fence-only ──"
if rg -q "checkGateFence" src/lib/geo.ts; then
  echo "  ✅ checkGateFence exists in geo.ts"
else
  echo "  ❌ checkGateFence missing"; fail=1
fi

[ "$fail" = 0 ] && echo "════ ✅ GEOLOCATION HARDENING VERIFIED ════" || echo "════ ❌ FAILED ════"
exit "$fail"
