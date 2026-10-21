#!/usr/bin/env bash
set -euo pipefail
cd /root/monitoring
echo "=== first-load gate: build + size check ==="
npm run build >/tmp/build.log 2>&1 && echo "BUILD OK" || { echo "BUILD FAILED"; tail -40 /tmp/build.log; exit 1; }
# locate the home css chunk in the build output and confirm grad vars are now defined
css=$(find .next -name "*.css" | xargs grep -l "home-blob" 2>/dev/null | head -1)
echo "home css: $css"
if grep -q -- "--home-grad-a:" "$css"; then
  echo "GATE PASS: --home-grad-a defined in shipped CSS"
else
  echo "GATE FAIL: --home-grad-a still undefined"
  exit 1
fi
# confirm the 140vmax blobs are gone
if grep -q "140vmax" "$css"; then
  echo "GATE FAIL: 140vmax blobs still present"
  exit 1
else
  echo "GATE PASS: no 140vmax blobs"
fi
echo "ALL GATES PASS"
