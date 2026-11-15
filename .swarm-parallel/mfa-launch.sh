#!/usr/bin/env bash
# MFA-role panel chain: principal, sysadmin (vice_principal + hostel have no seeds/accounts).
# Positional CLI: ux-swarm run <target> "<task>" [options].
# Sequential + MAX_CONCURRENT=2 to respect the OmniRoute circuit breaker.
set +e
cd /opt/monitoring/compose/.swarm-parallel
run() {
  role="$1"; console="$2"; task="$3"; seedname="$4"
  seaddir="/opt/monitoring/compose/.swarm-parallel/$role"
  seed="$seaddir/.swarm/$seedname"
  [ -f "$seed" ] || { echo "$role: no seed ($seedname) — skip"; return; }
  cd "$seaddir"
  export UX_SWARM_STORAGE_STATE=".swarm/$seedname"
  UX_SWARM_MAX_CONCURRENT=2 /usr/bin/ux-swarm run \
    "https://monitor.ucej.in${console}" "$task" \
    -u 20 -m 16 -w 1280 > "/tmp/uxswarm-$role-v1.log" 2>&1
  echo "$(date +%H:%M:%S) $role rc=$? (seed=$seedname)"
}
run principal "/principal" \
  "As the principal, open the principal console, check today's gate status and unresolved exceptions, and approve one pending item you can action. Note any confusion." \
  "principal/.swarm/principal-storage.json"
run sysadmin "/sysadmin" \
  "As the system administrator, open the sysadmin console, check the gate fleet health and scan exceptions, and acknowledge one alert. Note any confusion." \
  "sysadmin/.swarm/sysadmin-storage.json"
echo "MFA-CHAIN-DONE"
