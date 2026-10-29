#!/usr/bin/env bash
# CIS Ubuntu 22.04 LTS v3.0.0 Benchmark - Host Firewall (UFW) Configuration
#
# CRITICAL: Fixes Docker bridge forwarding bypass by configuring 'ufw default deny routed'
set -euo pipefail

echo "=== Configuring UFW Host Firewall ==="

# 1. Reset / set baseline policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Block Docker bridge forwarding bypass
# Without this, Docker's DOCKER-USER chain accepts bridge traffic before UFW filters it.
sudo ufw default deny routed

# 3. Allow SSH (port 22)
sudo ufw allow 22/tcp comment 'SSH'

# 4. Note on web traffic:
# Caddy is bound to 127.0.0.1:80 and 127.0.0.1:443; external traffic arrives via tunnel
# or reverse proxy on loopback.
echo "✓ UFW rules staged (Incoming: DENY, Outgoing: ALLOW, Routed: DENY, SSH: ALLOW)."
echo "Run 'sudo ufw enable' to activate."
