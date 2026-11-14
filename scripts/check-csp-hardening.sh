#!/usr/bin/env bash
# scripts/check-csp-hardening.sh
# L2 gate: verify the live response carries 'strict-dynamic' in script-src on
# the AUTHENTICATED surface, and that script-src there has no 'unsafe-inline'.
#
# The CSP is split by route class:
#   - Home page (/) is force-static: ships cached HTML without a nonce,
#     so strict-dynamic would block every chunk. Gets the relaxed policy
#     ('self' + 'unsafe-inline').
#   - All other routes: dynamic, Next.js SSR stamps the nonce, so
#     strict-dynamic works. Get the strict policy ('self' + nonce +
#     strict-dynamic) — that's the layer that contains stored XSS.
#
# This guard asserts BOTH surfaces:
#   1. /login (final 200) must have strict-dynamic + no 'unsafe-inline'.
#      The middleware sets CSP on the final response, not on 302s.
#   2. / must have 'unsafe-inline' in script-src (relaxed, by design).
#
# CI mode: BASE_URL points at a reachable app instance.
# Local mode: default http://127.0.0.1:80 (Caddy → web).
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:80}"

# ── 1. Authenticated surface: /login (final 200) ─────────────────────
# /login redirects from /admin/overview. The middleware sets the CSP
# header on the final 200 response, not on 302s. Check /login directly.
# Use curl -sI (HEAD) — headers only, no body. The CSP is set on the
# HEAD response too (the middleware runs on all verbs).
CSP=$(curl -sI "${BASE_URL}/login" 2>/dev/null | tr -d '\r' | grep -i '^content-security-policy:' | sed 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy:[[:space:]]*//' || true)

if [ -z "$CSP" ]; then
  echo "❌ CSP header missing on ${BASE_URL}/login" >&2
  echo "   Is the web container running? Is Caddy active?" >&2
  exit 1
fi

# Hard requirement: no 'unsafe-inline' in script-src on the strict surface.
SCRIPT_SRC=$(echo "$CSP" | grep -oE "script-src[^;]*" || true)
if [ -n "$SCRIPT_SRC" ] && echo "$SCRIPT_SRC" | grep -q "unsafe-inline"; then
  echo "❌ CSP has 'unsafe-inline' in script-src on STRICT surface (/login)" >&2
  echo "   script-src: $SCRIPT_SRC" >&2
  echo "   The route-class split is broken: 'unsafe-inline' leaked onto" >&2
  echo "   a dynamic route. Check PUBLIC_PATHS in middleware.ts — only" >&2
  echo "   the force-static home page should get the relaxed policy." >&2
  exit 1
fi

# Hard requirement: 'strict-dynamic' must be present on the strict surface.
if ! echo "$CSP" | grep -q "strict-dynamic"; then
  echo "❌ CSP missing 'strict-dynamic' on STRICT surface (/login)" >&2
  echo "   CSP: $CSP" >&2
  echo "   Rebuild caddy + web with the route-class split active." >&2
  exit 1
fi

echo "✓ CSP hardened on strict surface (strict-dynamic, no unsafe-inline)"
if echo "$CSP" | grep -q "nonce-"; then
  echo "  ✓ Per-request nonce active (web middleware live)"
else
  echo "  ⓘ nonce not yet active — rebuild the web container to enable per-request nonce"
fi

# ── 2. Relaxed surface: / (home page, force-static) ──────────────────
# The home page gets the relaxed policy BY DESIGN. This is an informational
# check — if it's broken, the home page's chunks are blocked (NO_FCP P0).
HOME_CSP=$(curl -sI "${BASE_URL}/" 2>/dev/null | tr -d '\r' | grep -i '^content-security-policy:' | sed 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy:[[:space:]]*//' || true)
if [ -n "$HOME_CSP" ]; then
  HOME_SCRIPT=$(echo "$HOME_CSP" | grep -oE "script-src[^;]*" || true)
  if [ -n "$HOME_SCRIPT" ] && ! echo "$HOME_SCRIPT" | grep -q "unsafe-inline"; then
    echo "⚠ home page CSP lacks 'unsafe-inline' — chunks will be blocked (home is force-static)" >&2
    echo "  home script-src: $HOME_SCRIPT" >&2
    echo "  The home page needs the relaxed policy. Check PUBLIC_PATHS in middleware.ts." >&2
  fi
  if [ -n "$HOME_SCRIPT" ] && echo "$HOME_SCRIPT" | grep -q "strict-dynamic"; then
    echo "⚠ home page CSP has strict-dynamic — chunks will be blocked (home is force-static)" >&2
    echo "  home script-src: $HOME_SCRIPT" >&2
    echo "  Remove '/' from the strict scope or make the home page dynamic." >&2
  fi
fi
