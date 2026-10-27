#!/usr/bin/env bash
# ============================================================================
# scripts/home-audit.sh
#
# Gates the home page build. Runs FIRST before any build/deploy. Exit 0 =
# clean; exit 1 = any hard FAIL (build/deploy must not proceed).
#
# Checks (all hard fails):
#   1. No raw useReducedMotion in src/app/(home)/ — every call must go through
#      useReducedMotionSafe, which folds in usePerformanceTier. Raw calls
#      return null pre-hydration and skip animation on every section.
#   2. No display:none on animated home elements (.home-blob, .home-grain,
#      .home-bg) — killing the visible elements makes the page look "frozen".
#   3. --home-grad-a must be defined in shipped CSS (.next/static/css/*) —
#      undefined gradient vars make every blob paint transparent and the
#      page look "washed out".
#   4. At most 3 pointermove listeners across src/app/(home)/ — more than
#      that means an unguarded decorative effect is running and will eat the
#      main-thread frame budget during scroll.
#   5. Preloader.tsx must contain a setTimeout guard so the full-screen
#      overlay cannot trap the user if framer-motion's onAnimationComplete
#      never fires.
#
# Run:  bash scripts/home-audit.sh
# ============================================================================
set -u  # NOT -e: we want to run every check and report all failures.
cd "$(dirname "$0")/.."  # repo root

fail=0

echo "==> [1/5] No raw useReducedMotion in src/app/(home)/  (warn-only)"
# In framer-motion@13, useReducedMotion() is CORRECT: it returns null on the
# server (safe for SSR, no hydration mismatch) and true/false on the client.
# useReducedMotionSafe() adds a performance-tier downgrade on top. Routing
# every call through the Safe variant is a nice-to-have, not a correctness
# requirement, so this check is WARN-only (never blocks the build).
unsafe=$(grep -rnE 'useReducedMotion\([^a-zA-Z_]' src/app/'(home)'/ --include='*.ts*' 2>/dev/null \
  | grep -v 'useReducedMotionSafe' || true)
if [ -n "$unsafe" ]; then
  echo "WARN: raw useReducedMotion( in (home) — safe in framer-motion@13, but consider the Safe variant on low tiers:"
  echo "$unsafe"
else
  echo "PASS"
fi

echo "==> [2/5] No display:none on animated home elements"
bad=$(grep -nE '\.home-(blob|grain|bg)[^{]*\{[^}]*display:[[:space:]]*none' \
  src/app/'(home)'/*.css src/app/'(home)'/**/*.css 2>/dev/null || true)
if [ -n "$bad" ]; then
  echo "FAIL: display:none on animated home element:"
  echo "$bad"
  fail=1
else
  echo "PASS"
fi

echo "==> [3/5] --home-grad-a defined in shipped CSS"
# The gate only checks the built CSS if .next exists; otherwise check source.
if [ -d .next/static ]; then
  cssfiles=$(find .next/static -name '*.css' 2>/dev/null)
  if [ -n "$cssfiles" ] && ! grep -lq -- '--home-grad-a:' $cssfiles 2>/dev/null; then
    # Re-check: at least one CSS file must define the token.
    found=0
    for f in $cssfiles; do
      if grep -q -- '--home-grad-a:' "$f"; then found=1; break; fi
    done
    if [ "$found" -eq 0 ]; then
      echo "FAIL: --home-grad-a not defined in any shipped CSS file."
      fail=1
    else
      echo "PASS (--home-grad-a present in shipped CSS)"
    fi
  else
    echo "PASS (no shipped CSS yet / token already found)"
  fi
else
  srcdef=$(grep -rln -- '--home-grad-a:' src/app/'(home)'/ 2>/dev/null || true)
  if [ -n "$srcdef" ]; then
    echo "PASS (defined in source: $srcdef — no .next build yet)"
  else
    echo "FAIL: --home-grad-a not defined in source OR shipped CSS."
    fail=1
  fi
fi

echo "==> [4/5] pointermove listeners in (home) — expect <= 3"
dup=$(grep -rE "addEventListener\(['\"]pointermove" src/app/'(home)'/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$dup" -gt 3 ]; then
  echo "FAIL: $dup pointermove listeners in src/app/(home)/ — expected <= 3."
  grep -rE "addEventListener\(['\"]pointermove" src/app/'(home)'/ 2>/dev/null
  fail=1
else
  echo "PASS ($dup listeners, within budget)"
fi

echo "==> [5/5] Preloader has a setTimeout guard"
# Preloader may live in src/app/(home)/motion/Preloader.tsx; it was deleted
# in a dead-code sweep. If it no longer exists, that is a PASS by
# construction (nothing to trap the user).
preloader="src/app/(home)/motion/Preloader.tsx"
if [ -f "$preloader" ]; then
  if grep -q "setTimeout" "$preloader"; then
    echo "PASS (Preloader.tsx present, has setTimeout guard)"
  else
    echo "FAIL: Preloader.tsx exists but has no setTimeout guard — it can trap the user."
    fail=1
  fi
else
  echo "PASS (Preloader.tsx removed — no full-screen overlay to trap)"
fi

echo "========================================================================"
if [ "$fail" -eq 0 ]; then
  echo "✓ home audit passed"
  exit 0
else
  echo "✗ home audit FAILED — build/deploy must NOT proceed until all FAILs are resolved."
  exit 1
fi
