#!/usr/bin/env bash
# Verify that a heavy library's marker does NOT appear in any chunk that the
# root layout (and therefore every first-load page) references.
#
# Usage:
#   bash scripts/verify-no-heavy-first-load.sh <marker> [marker2 ...]
#
# Examples:
#   bash scripts/verify-no-heavy-first-load.sh "LucideAccessibility"
#   bash scripts/verify-no-heavy-first-load.sh "THREE.WebGLRenderer" "recharts"
#
# Requires a prior `npm run build` (or `next build`) to have produced .next/.
# Exits 0 if no marker is present in first-load chunks, 1 otherwise.

set -euo pipefail

MANIFEST=".next/build-manifest.json"
MARKERS=("$@")

if [ ${#MARKERS[@]} -eq 0 ]; then
  echo "usage: $0 <marker> [marker2 ...]" >&2
  exit 2
fi

if [ ! -f "$MANIFEST" ]; then
  echo "No $MANIFEST — did the build succeed? Run 'npm run build' first." >&2
  exit 1
fi

# rootMainFiles is the shared chunk set loaded on every first-load page
# (the app-router equivalent of the root-layout chunk list).
CHUNKS=$(node -e "
  const m = require('./$MANIFEST');
  const root = m.rootMainFiles || [];
  console.log(root.join('\n'));
")

if [ -z "$CHUNKS" ]; then
  echo "No chunks found under the root layout in $MANIFEST." >&2
  exit 1
fi

FAILED=0
for marker in "${MARKERS[@]}"; do
  echo "Checking '$marker' against root-layout chunks..."
  FOUND=0
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    f=".next/${c}"
    [ -f "$f" ] || continue
    if grep -q "$marker" "$f" 2>/dev/null; then
      echo "  FAIL: '$marker' found in $c" >&2
      FOUND=1
      FAILED=1
    fi
  done <<< "$CHUNKS"
  [ "$FOUND" -eq 0 ] && echo "  PASS: '$marker' not in any first-load chunk"
done

if [ "$FAILED" -eq 0 ]; then
  echo
  echo "PASS: no heavy-library marker found in the first-load bundle."
  exit 0
fi

echo
echo "FAIL: at least one heavy-library marker is still in the first-load bundle." >&2
echo "Open the app in a browser, DevTools > Network, and confirm the heavy" >&2
echo "chunk only loads after the user interaction that triggers it." >&2
exit 1
