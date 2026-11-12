#!/usr/bin/env bash
# D4 — host-hardening installer.
#
# Installs the CIS hardening profiles from compose/security/ onto the host:
#   * auditd rules (drops the noisy /var/lib/docker watch)
#   * sshd hardening
#   * sysctl hardening
#   * AIDE config
#   * fail2ban jail (parameterised caddy_data volume)
#   * pgaudit config (mounted into postgres via compose)
#
# Must run AFTER 03-deploy.sh (the caddy_data volume must exist for
# fail2ban parameterisation).

set -euo pipefail

BASE_DIR="${BASE_DIR:-/opt/monitoring}"
REPO_DIR="${REPO_DIR:-$(pwd)}"

echo "==> Installing CIS hardening profiles from ${REPO_DIR}/compose/security"

# --- auditd rules ---------------------------------------------------------
# Drop the /var/lib/docker watch (generates GB/day of noise, can fill disk);
# keep daemon.json and the backups watch.
install -D -m 0640 "${REPO_DIR}/compose/security/auditd-gate-monitor.rules" \
  /etc/audit/rules.d/gate-monitor.rules
sed -i '/-w \/var\/lib\/docker\/ -p wd -k docker_data/d' /etc/audit/rules.d/gate-monitor.rules
augenrules --load

# --- sshd + sysctl + AIDE -------------------------------------------------
install -D -m 0644 "${REPO_DIR}/compose/security/sshd-99-hardening.conf" \
  /etc/ssh/sshd_config.d/99-hardening.conf
install -D -m 0644 "${REPO_DIR}/compose/security/sysctl-99-hardening.conf" \
  /etc/sysctl.d/99-hardening.conf
sysctl --system >/dev/null
install -D -m 0644 "${REPO_DIR}/compose/security/aide-gate-monitor.conf" \
  /etc/aide/aide.conf.d/99-gate-monitor

# --- fail2ban -------------------------------------------------------------
# Parameterise the caddy_data volume name. The compose project prefix is the
# directory name (e.g. `compose_caddy_data`, NOT `gate_caddy_data`), so
# resolve the actual volume name at install time.
CADDY_VOL="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)caddy_data$' | head -1)"
[ -n "$CADDY_VOL" ] || { echo "❌ caddy_data volume not found (run 03-deploy.sh first)"; exit 1; }
CADDY_LOG="/var/lib/docker/volumes/${CADDY_VOL}/_data/access.log"
sed "s|/var/lib/docker/volumes/gate_caddy_data/_data/access.log|${CADDY_LOG}|" \
  "${REPO_DIR}/compose/security/gate-monitor.local" \
  > /etc/fail2ban/jail.d/gate-monitor.conf
install -D -m 0644 "${REPO_DIR}/compose/security/caddy-4xx.conf" \
  /etc/fail2ban/filter.d/caddy-4xx.conf
systemctl reload fail2ban

# --- pgaudit --------------------------------------------------------------
# Mount into the postgres conf.d include. The compose postgres service must
# have `include_dir = 'conf.d'` in its postgresql.conf (added by D4).
install -D -m 0644 "${REPO_DIR}/compose/security/pgaudit.conf" \
  "${BASE_DIR}/compose/pgaudit.conf"

echo "✓ Host hardening profiles installed"
