# Gate Monitor - Security Posture Reference

## 1. Network Boundary & Port Hardening
- **Zero Exposed Internal Ports**: PostgreSQL (5432), Redis (6379), Web (3000), and Worker are isolated within `gate-net` Docker bridge.
- **Single External Ingress**: Only `gate_caddy` exposes ports 80 and 443 to the host network.
- **Host Firewall (UFW)**: External traffic to 5432, 6379, and 3000 should be rejected by host firewall rules.

## 2. Cryptographic Security Standards
- **Access Tokens**: HS256 JWT minted using 256-bit cryptographic secrets (`AUTH_JWT_SECRET`). Minimum 32-character entropy enforced.
- **Password Hashes**: Salted bcrypt hashing with work factor 10-12.
- **Session Tokens**: Cryptographically random UUID tokens stored server-side.
- **Cookie Flags**: `HttpOnly; Secure; SameSite=Lax` applied on all authentication cookies.

## 3. Rate Limiting & Denial of Service Protection
- Distributed token bucket rate limiting powered by Redis (with in-memory fallback).
- Thresholds configured per endpoint sensitivity:
  - Auth / Login: 5 requests / min
  - Scans: 30 requests / min
  - Standard API: 100 requests / min

## 4. Secrets Management
- Production credentials stored exclusively in `/opt/monitoring/env/production.env` with `chmod 600` permissions owned by `root`.
- `.env*` files strictly excluded from Git tracking via `.gitignore`.
