#!/usr/bin/env bash
# Frontend-only repomix pack for jntucej/monitoring.
# Config: repomix.frontend.json (include=src/app|components|hooks|stores|context|lib|types|config,
#        ignore.customPatterns excludes every backend/test tree).
# Usage:  bash repomix-frontend.sh        -> repomix-frontend.xml
#         bash repomix-frontend.sh --md   -> repomix-frontend.md
set -euo pipefail
cd "$(dirname "$0")"

style="${1:-xml}"
case "$style" in
  --md|md) style="md";;
  *) style="xml";;
esac

# Point output at the requested style so one config covers both
sed -E "s/\"style\": \"xml\"/\"style\": \"${style}\"/" repomix.frontend.json > /tmp/repomix-frontend-run.json
out="repomix-frontend.${style}"
sed -E "s/\"filePath\": \"repomix-frontend.xml\"/\"filePath\": \"${out}\"/" /tmp/repomix-frontend-run.json > /tmp/repomix-frontend-run2.json
repomix -c /tmp/repomix-frontend-run2.json 2>&1 | grep -E 'Total Files|Output|Security|✖|Error'

# Verify frontend-only: no backend/test trees in the packed output
if grep -qE '<file (path|name)="(database/|tests/|worker/|packages/|scripts/|public/|compose/|docs/|k8s/|systemd/|src/server/|src/contracts/|src/metrics/|src/app/api/)' "$out"; then
  echo "⚠ Non-frontend files leaked into $out:" >&2
  grep -oE '<file (path|name)="(database|tests|worker|packages|scripts|public|compose|docs|k8s|systemd|src/server|src/contracts|src/metrics|src/app/api)[^"]*"' "$out" | sort -u | head >&2
  exit 1
fi

echo "✅ $out is frontend-only. Breakdown:"
grep -oE '<file (path|name)="[^"]+"' "$out" | sed -E 's/<file (path|name)="//; s/"$//' | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn | head -20
