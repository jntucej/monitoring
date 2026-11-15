#!/usr/bin/env bash
# Gate 1.1/1.4: run the Impeccable anti-slop detector against the live,
# authenticated consoles via CDP. For each role: launch a headless Chromium
# with the storage-state seed on a unique DevTools port, wait for the page,
# attach `impeccable detect --cdp`, print findings, tear down, next.
set +e
cd /opt/monitoring/compose
SPEC=(
  "admin:/admin"
  "principal:/principal"
  "supervisor:/supervisor"
  "staff:/staff"
  "faculty:/faculty"
  "oie:/oie"
)
n=0
for s in "${SPEC[@]}"; do
  role="${s%%:*}"; url="${s#*:}"
  port=$((9700 + n * 17))
  seed=".swarm-parallel/$role/.swarm/$role-storage.json"
  n=$((n+1))
  [ -f "$seed" ] || { echo "=== $role: no seed, skip ==="; continue; }
  echo ""
  echo "============================================"
  echo "=== CONSOLE: $role ($url)  [CDP port $port] ==="
  echo "============================================"
  # Launch CDP host for this role (blocks until SIGTERM).
  node scripts/cdp-scan-host.js "$role" "https://monitor.ucej.in$url" "$port" "$seed" &
  cdp_pid=$!
  # Wait for the page to be a CDP target.
  ready=""
  for i in $(seq 1 20); do
    sleep 4
    ok=$(curl -s "http://localhost:$port/json" 2>/dev/null | python3 -c "import sys,json
try: print(any('$url' in (t.get('url') or '') for t in json.load(sys.stdin)))
except: print(False)" 2>/dev/null)
    [ "$ok" = "True" ] && { ready=1; break; }
  done
  if [ -z "$ready" ]; then
    echo "  (page not ready on $port — skipping scan)"
    kill "$cdp_pid" 2>/dev/null; wait "$cdp_pid" 2>/dev/null; sleep 2; continue
  fi
  # Run the detector.
  npx -y impeccable@4.9.1 detect --cdp "$port" --target "monitor.ucej.in$url" 2>&1 \
    | grep -iE 'low-contrast|skipped-heading|anti-pattern|gradient|nested-card|overused|cream|ai-color|flat-type|monotonous|side-tab|slop|^\s*\[' | head -14
  echo "  --- $role scan complete ---"
  kill "$cdp_pid" 2>/dev/null
  wait "$cdp_pid" 2>/dev/null
  sleep 3
done
echo ""
echo "DETECTOR-SWEEP-DONE"
