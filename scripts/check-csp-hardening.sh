#!/usr/bin/env bash
# scripts/check-csp-hardening.sh
# L2 gate: verify the live response carries 'strict-dynamic' in script-src and
# that script-src no longer contains 'unsafe-inline'.
#
# When the web container is rebuilt with the L2 middleware, a per-request
# nonce is also active; that is reported as an informational note, not a
# hard requirement, because Caddy's static CSP baseline (strict-dynamic, no
# unsafe-inline) is the minimum production floor.
#
# CI mode: BASE_URL points at a reachable app instance.
# Local mode: default http://127.0.0.1:80 (Caddy → web).
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:80}"

CSP=$(curl -sI "${BASE_URL}/" 2>/dev/null | tr -d '\r' | grep -i '^content-security-policy:' | sed 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy:[[:space:]]*//' || true)

if [ -z "$CSP" ]; then
  echo "❌ CSP header missing on ${BASE_URL}/" >&2
  echo "   Is the web container running? Is Caddy active?" >&2
  exit 1
fi

# Hard requirement: no 'unsafe-inline' anywhere in script-src.
SCRIPT_SRC=$(echo "$CSP" | grep -oE "script-src[^;]*" || true)
if [ -n "$SCRIPT_SRC" ] && echo "$SCRIPT_SRC" | grep -q "unsafe-inline"; then
  echo "❌ CSP still has 'unsafe-inline' in script-src (security theater)" >&2
  echo "   script-src: $SCRIPT_SRC" >&2
  exit 1
fi

# Hard requirement: 'strict-dynamic' must be present.
if ! echo "$CSP" | grep -q "strict-dynamic"; then
  echo "❌ CSP missing 'strict-dynamic'" >&2
  echo "   CSP: $CSP" >&2
  echo "   Rebuild caddy + web with the Batch L2 changes." >&2
  exit 1
fi

echo "✓ CSP hardened (strict-dynamic, no unsafe-inline in script-src)"
if echo "$CSP" | grep -q "nonce-"; then
  echo "  ✓ Per-request nonce active (web middleware live)"
else
  echo "  ⓘ nonce not yet active — rebuild the web container to enable per-request nonce"
fi
