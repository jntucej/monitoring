#!/usr/bin/env bash
# scripts/verify-no-heavy-first-load.sh
#
# Ground-truth first-load performance gate.
#
# How it works:
#   1. Starts a production Next.js server (npx next start) on an ephemeral port.
#   2. Fetches the real HTML of / — the exact set of chunks a browser downloads
#      on a cold first-load.
#   3. Enforces three tiers of budgets:
#        PRIMARY   — total first-load JS bytes. Catches ANY regression, not just
#                    lucide or three. This is the backstop.
#        SECONDARY — count of icon path d="M / "d":"M strings across first-load
#                    chunks. Fires whenever the lucide registry (or any
#                    icon-heavy library) ends up in first-load, regardless of
#                    the mechanism (dynamic indexing, multiple named imports,
#                    a future bundler config change).
#        TERTIARY  — specific tree-shake-resistant library markers:
#                      three/react-three: "WebGLRenderer" or "THREE.REVISION"
#                      recharts:          "ResponsiveContainer"
#                    These export names appear as strings ONLY when the library
#                    is actually bundled, so they survive tree-shaking.
#
# Usage:
#   bash scripts/verify-no-heavy-first-load.sh
#
# Requires a prior `npm run build` (or `next build`) to have produced .next/.
# Exits 0 within budget, 1 on any FAIL.

set -euo pipefail

# ── Budgets ────────────────────────────────────────────────────────────────────
# Adjust these to current-state + margin. Current baseline: 831 KB / 0 icon
# paths / no three or recharts markers in first-load.
TOTAL_BUDGET_KB=950          # fail above this
TOTAL_WARN_KB=900           # warn above this
ICON_PATH_FAIL=300          # fail above this (full lucide registry is ~4000)

# ── 1. Ensure a build exists ───────────────────────────────────────────────────
if [ ! -d .next ] || [ ! -f .next/BUILD_ID ]; then
  echo "No .next build found. Running 'npm run build' first…"
  npm run build >/dev/null 2>&1
fi

# ── 2. Start the production server ────────────────────────────────────────────
PORT=$(( (RANDOM % 1000) + 32000 ))
LOG=$(mktemp)
npx next start -p "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; rm -f "$LOG"; }
trap cleanup EXIT

# Wait for readiness (max 45 s).
for i in $(seq 1 45); do
  curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null && break
  sleep 1
done
if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; then
  echo "❌ next start failed to become ready. Log tail:"
  tail -25 "$LOG" >&2
  exit 1
fi

# ── 3. Fetch / and extract the first-load chunk set ───────────────────────────
HTML=$(curl -sf "http://127.0.0.1:${PORT}/")
CHUNKS=$(echo "$HTML" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u)

if [ -z "$CHUNKS" ]; then
  echo "❌ Could not extract first-load chunks from the rendered HTML of /."
  echo "   This usually means the server didn't serve real content."
  tail -25 "$LOG" >&2
  exit 1
fi

echo "First-load chunk set (from / HTML): $(echo "$CHUNKS" | wc -l | tr -d ' ') chunks"

# Resolve each HTML path (/.../_next/static/chunks/x.js) to its on-disk file.
# In Next 16 / Turbopack the chunks live under .next/static/chunks/ directly.
# We search for the basename under .next/static to be layout-agnostic.
RESOLVED=""
for u in $CHUNKS; do
  base=$(basename "$u")
  f=$(find .next/static -name "$base" 2>/dev/null | head -1)
  [ -n "$f" ] && RESOLVED="${RESOLVED}${f}"$'\n'
done
RESOLVED=$(echo "$RESOLVED" | sort -u)
RESOLVED_COUNT=$(echo "$RESOLVED" | grep -c . || true)

if [ "$RESOLVED_COUNT" -eq 0 ]; then
  echo "❌ No first-load chunk files resolved on disk."
  exit 1
fi
echo "Resolved $RESOLVED_COUNT chunk files on disk."

# ── 4. Sum total size ─────────────────────────────────────────────────────────
TOTAL_BYTES=0
for f in $RESOLVED; do
  [ -f "$f" ] || continue
  TOTAL_BYTES=$(( TOTAL_BYTES + $(stat -c%s "$f") ))
done
TOTAL_KB=$(( TOTAL_BYTES / 1024 ))
echo "Total first-load JS: ${TOTAL_KB} KB"

# ── 5. Count icon path d="M / "d":"M strings across first-load chunks ───────
ICON_PATHS=0
for f in $RESOLVED; do
  [ -f "$f" ] || continue
  ICON_PATHS=$(( ICON_PATHS + $(grep -oE '"d":"M' "$f" 2>/dev/null | wc -l || true) ))
  ICON_PATHS=$(( ICON_PATHS + $(grep -oE 'd="M' "$f" 2>/dev/null | wc -l || true) ))
done
echo "Icon path d=\"M count across first-load: ${ICON_PATHS}"

# ── 6. Tertiary library markers (tree-shake-resistant) ────────────────────────
THREE_HIT=""
RECHARTS_HIT=""
for f in $RESOLVED; do
  [ -f "$f" ] || continue
  if grep -qE 'WebGLRenderer|THREE\.REVISION' "$f" 2>/dev/null; then
    THREE_HIT="${THREE_HIT}${f}"$'\n'
  fi
  if grep -q 'ResponsiveContainer' "$f" 2>/dev/null; then
    RECHARTS_HIT="${RECHARTS_HIT}${f}"$'\n'
  fi
done

# ── 7. Enforce budgets ────────────────────────────────────────────────────────
FAIL=0

# PRIMARY: total size budget.
if [ "$TOTAL_KB" -gt "$TOTAL_BUDGET_KB" ]; then
  echo "❌ TOTAL first-load (${TOTAL_KB} KB) exceeds ${TOTAL_BUDGET_KB} KB budget."
  FAIL=1
elif [ "$TOTAL_KB" -gt "$TOTAL_WARN_KB" ]; then
  echo "⚠️  TOTAL first-load (${TOTAL_KB} KB) approaching ${TOTAL_BUDGET_KB} KB budget."
fi

# SECONDARY: lucide / icon-heavy registry.
if [ "$ICON_PATHS" -gt "$ICON_PATH_FAIL" ]; then
  echo "❌ ${ICON_PATHS} icon path d=\"M strings in first-load (> ${ICON_PATH_FAIL})."
  echo "   Likely cause: the lucide registry (thousands of icons) is bundled into"
  echo "   first-load. Check for 'import * as Icons from \"lucide-react\"' plus a"
  echo "   dynamic key lookup (iconMap[icon]) — that pattern cannot be tree-shaken."
  echo "   Use named imports via src/lib/lucide-icon-resolver.ts instead."
  echo "   See docs/PERFORMANCE.md."
  FAIL=1
fi

# TERTIARY: three/react-three in first-load.
if [ -n "$THREE_HIT" ]; then
  echo "❌ three/react-three detected in first-load chunks:"
  echo "$THREE_HIT" | sed 's/^/     /' >&2
  echo "   Wrap the offending component in next/dynamic({ ssr: false }) so the 3D"
  echo "   bundle loads only when the user triggers it."
  FAIL=1
fi

# TERTIARY: recharts in first-load.
if [ -n "$RECHARTS_HIT" ]; then
  echo "❌ recharts detected in first-load chunks:"
  echo "$RECHARTS_HIT" | sed 's/^/     /' >&2
  echo "   Lazy-load the chart component with next/dynamic({ ssr: false })."
  FAIL=1
fi

# ── 8. Exit ────────────────────────────────────────────────────────────────────
if [ "$FAIL" -eq 1 ]; then
  echo
  echo "FAIL: first-load performance budget exceeded."
  exit 1
fi

echo
echo "✅ PASS: first-load within budget (${TOTAL_KB} KB, ${ICON_PATHS} icon paths, no three/recharts markers)."
exit 0
