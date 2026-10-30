#!/usr/bin/env bash
set -euo pipefail
# auto-fix-push.sh - Safely applies fixes to components without breaking server-only exports.
# R3-17 fix: skips files that export metadata, generateMetadata, dynamic, revalidate, runtime,
# and protects layout.ts, route.ts, and _panel.tsx files.

file="${1:-}"

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Usage: $file <file-path>" >&2
  exit 1
fi

if grep -qE 'export (const|async function) (metadata|generateMetadata|dynamic|revalidate|runtime)' "$file"; then
  echo "Skip $file: server-only exports present" >&2
  exit 0
fi

if [[ "$file" =~ /(layout\.ts|route\.ts|_panel\.tsx)$ ]]; then
  echo "Skip $file: protected layout/route/panel file" >&2
  exit 0
fi

if ! grep -q '"use client"' "$file"; then
    sed -i '1s/^/"use client";\n\n/' "$file"
    echo "Injected \"use client\" into $file"
fi
