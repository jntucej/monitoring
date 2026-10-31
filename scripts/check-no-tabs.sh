#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

# 1. No useState<tab> / setTab / useTabSwitcher in page routes
hits=$(grep -rEn "useState<[^>]*[Tt]ab|setTab\(|useTabSwitcher" src/app --include="*.tsx" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "❌ Tab state detected — convert to route:"
  echo "$hits"
  fail=1
fi

# 2. No ?tab= query params that swap page content
hits=$(grep -rEn "searchParams\.(get|has)\(['\"]tab['\"]\)" src/app --include="*.tsx" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "❌ ?tab= query param detected — convert to route:"
  echo "$hits"
  fail=1
fi

# 3. No <Tabs>/<TabBar>/<TabStrip>/<SegmentedControl> rendered inside page routes
hits=$(grep -rEn "<(Tabs|TabBar|TabStrip|SegmentedControl)\b" src/app --include="*.tsx" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "❌ Tab component rendered in a page — convert to sidebar dropdown:"
  echo "$hits"
  fail=1
fi

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "The rule: every view is a route; every route is in the sidebar; no tabs."
  exit 1
fi

echo "✓ No tabs anywhere. All views are routes."
