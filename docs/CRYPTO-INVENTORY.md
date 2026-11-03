# Crypto Inventory — Batch L7
#
# Post-quantum readiness: the migration is an architectural problem, not an
# algorithm swap. Certificates, trust stores, HSMs, middleboxes, and
# inventory constrain deployment as much as primitive availability.
#
# The rule (L7c): **hybrid key exchange, not pure PQC.** If the PQC
# algorithm is broken, the classical component still holds; if the
# classical is broken by a quantum computer, the PQC component holds.
# Pure PQC today is a regression risk, not an improvement.
#
# Symmetric crypto (AES-256) and hashing (SHA-256) are already
# quantum-resistant — only key exchange and signatures need replacement.

| Boundary | Algorithm today | PQC target | Owner | Blocker / Notes |
|---|---|---|---|---|
| TLS (Caddy → client) | X25519 + P-256 (classical) | X25519MLKEM768 hybrid | Infra | Caddy ≥ 2.10 + Go ≥ 1.24 negotiates hybrid automatically; Cloudflare terminates first |
| TLS (Cloudflare → Caddy) | Depends on CF | Hybrid (already supported by CF) | Infra | None — verify CF plan supports MLKEM |
| JWT signing (`AUTH_JWT_SECRET`) | HS256 (symmetric) | ML-DSA (signing) | App | Requires keyring migration; 2027–2028 project — do not start until `AUTH_JWT_SECRETS` is in active rotation and this inventory is current |
| Passkey / WebAuthn | ES256 / EdDSA | ML-DSA | App | SimpleWebAuthn v13 supports; no action needed until ecosystem ships |
| Backup encryption (`COLD_BACKUP_ENCRYPTION_KEY`) | AES-256-GCM | AES-256-GCM (unchanged) | Infra | Symmetric — quantum-safe already; no migration needed |
| DB password (`gate_app`) | bcrypt hash | unchanged | App | Auth at rest, not transport — no PQC surface |
| Sigstore / Cosign | ECDSA P-256 | ML-DSA (Sigstore is migrating) | CI | Track Sigstore release; keyless OIDC signing already in use |
| `TOTP_ENCRYPTION_KEY` / MFA | AES (symmetric) | unchanged | App | Symmetric — quantum-safe |
| `QR_TOKEN_SECRET` / `MOBILE_TOKEN_SECRET` | HMAC-SHA (symmetric) | unchanged | App | Symmetric — quantum-safe |

## Actionable items

### Now (L7b — hybrid TLS at Caddy)

Caddy 2.10+ with Go 1.24+ negotiates X25519MLKEM768 automatically when the
client offers it. No Caddyfile change is strictly required — Go's TLS stack
enables the hybrid groups by default. Verify with:

```bash
openssl s_client -connect monitor.cej.in:443 -groups X25519MLKEM768 -brief </dev/null 2>&1 \
  | grep -iE "group|hybrid|MLKEM"
# Expect: Negotiated TLS1.3 group: X25519MLKEM768 (or X25519Kyber768Draft00 on older OpenSSL)
```

If the probe shows no hybrid group, upgrade Caddy to ≥ 2.10 / Go ≥ 1.24.

### Before starting JWT/Passkey PQC migration (2027–2028)

1. This inventory is current and reviewed quarterly.
2. `AUTH_JWT_SECRETS` is in active rotation (multiple keys, graceful
   deprecation window) — a PQC signing migration with a single static
   key is a key-management regression.
3. The Cosign / Sigstore pipeline is on a release that supports ML-DSA
   attestations.
4. The WebAuthn ecosystem (browser + authenticator) ships ML-DSA
   credential support — check SimpleWebAuthn changelog.

### Rules

- **Do not** replace classical algorithms with pure PQC before the
  ecosystem (trust stores, middleboxes, HSMs) catches up.
- **Do** record every cryptographic boundary in this table and re-verify
  quarterly. A new boundary that isn't in this table is a gap.
- **Do** treat hybrid key exchange as the answer until the row above is
  clear — not a migration to pure PQC.
