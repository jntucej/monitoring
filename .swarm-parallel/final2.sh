#!/usr/bin/env bash
# Final 2 MFA-now-off roles: vice_principal, hostel_manager.
# MFA was just turned off on these accounts; fresh seeds captured (authenticated=true).
set +e
cd /opt/monitoring/compose/.swarm-parallel
export OPENAI_API_BASE="http://localhost:20128/v1"
export OPENAI_API_KEY="$OMNIROUTE_API_KEY"

run() {
  role="$1"; console="$2"; task="$3"
  seaddir="/opt/monitoring/compose/.swarm-parallel/$role"
  cd "$seaddir"
  export UX_SWARM_STORAGE_STATE=".swarm/$role-storage.json"
  UX_SWARM_MAX_CONCURRENT=2 /usr/bin/ux-swarm run \
    "https://monitor.ucej.in${console}" "$task" \
    -u 20 -m 16 -w 1280 > "/tmp/uxswarm-$role-v1.log" 2>&1
  echo "$(date +%H:%M:%S) $role rc=$?"
}
run vice_principal "/vice-principal" \
  "As the vice principal, open the vice-principal console, check pending approvals and gate status, and act on one pending item. Note any confusion, dead-ends, or unclear labels."
run hostel_manager "/hostel-manager" \
  "As the hostel manager, open the hostel-manager console, check the complaints/requests queue and resident movement, and act on one item. Note any confusion, dead-ends, or unclear labels."
echo "FINAL-2-DONE"
