#!/usr/bin/env bash
# Re-runs that were pending: caretaker (correct /caretaker URL), admin v4 (exceptions link).
# Runs after any other panel finishes (circuit-breaker safety).
set +e
cd /opt/monitoring/compose/.swarm-parallel
export OPENAI_API_BASE="http://localhost:20128/v1"
export OPENAI_API_KEY="$OMNIROUTE_API_KEY"
while pgrep -f "ux-swarm run" >/dev/null; do sleep 20; done

cd caretaker
export UX_SWARM_STORAGE_STATE=".swarm/caretaker-storage.json"
/usr/bin/ux-swarm run "https://monitor.ucej.in/caretaker" \
  "As the hostel caretaker, open the caretaker console, check the maintenance/complaints queue, and open one work order to see its details. Note any confusion." \
  -u 16 -m 10 -w 1280 > /tmp/uxswarm-caretaker-v2.log 2>&1
echo "$(date +%H:%M:%S) caretaker-v2 rc=$?"

cd ../admin
export UX_SWARM_STORAGE_STATE=".swarm/admin-storage.json"
/usr/bin/ux-swarm run "https://monitor.ucej.in/admin" \
  "As the admin, open the admin overview, review the gate fleet status, then navigate to the scan exceptions view and open one flagged exception. Note any confusion." \
  -u 16 -m 10 -w 1280 > /tmp/uxswarm-admin-v4.log 2>&1
echo "$(date +%H:%M:%S) admin-v4 rc=$?"
echo "RERUN-2-DONE"
