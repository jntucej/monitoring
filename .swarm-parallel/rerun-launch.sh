#!/usr/bin/env bash
# Post-MFA re-run chain: caretaker (correct /caretaker URL) + admin v4 (exceptions link).
# Waits for any running panel to finish first (circuit-breaker safety).
set +e
cd /opt/monitoring/compose/.swarm-parallel
while pgrep -f "ux-swarm run" >/dev/null; do sleep 20; done

export UX_SWARM_STORAGE_STATE="caretaker/.swarm/caretaker-storage.json"
/usr/bin/ux-swarm run "https://monitor.ucej.in/caretaker" \
  "As the hostel caretaker, open the caretaker console, check the maintenance/complaints queue, and open one work order to see its details. Note any confusion." \
  -u 20 -m 16 -w 1280 > /tmp/uxswarm-caretaker-v2.log 2>&1
echo "$(date +%H:%M:%S) caretaker-v2 rc=$?"

export UX_SWARM_STORAGE_STATE="admin/.swarm/admin-storage.json"
/usr/bin/ux-swarm run "https://monitor.ucej.in/admin" \
  "As the admin, open the admin overview, review the gate fleet status, then navigate to the scan exceptions view and open one flagged exception. Note any confusion." \
  -u 20 -m 16 -w 1280 > /tmp/uxswarm-admin-v4.log 2>&1
echo "$(date +%H:%M:%S) admin-v4 rc=$?"
echo "RERUN-CHAIN-DONE"
