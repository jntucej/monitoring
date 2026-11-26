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
- Distributed rate limiting powered by Redis Lua `EVALSHA` (`INCR` + `PEXPIRE` with `NOSCRIPT` recovery) and PostgreSQL fallback (`RATELIMIT_PRIMARY_STORE`, default `postgres`).
- Central policy map (`src/lib/rate-limit-policies.ts`):
  - `auth`: 10 requests / min (fail-closed)
  - `otp`: 5 requests / min (fail-closed)
  - `admin-mutation`: 20 requests / min (fail-closed)
  - `expensive`: 5 requests / min
  - `default`: 120 requests / min
  - `dashboard`: 180 requests / min
- Payload size limits (U8/U8.1): Edge `Content-Length` fast-reject + `setupBodyCaching` streamed byte limits (`1 MB` JSON / `25 MB` multipart → `413 PAYLOAD_TOO_LARGE`).
- Unified middleware chain (U7): `withApiChain` (`src/lib/api-chain.ts`) runs `withAuthorization` before `withRateLimit` on all authenticated routes (0 inverted sites across 798 API route files).

## 4. Secrets Management
- Production credentials stored exclusively in `/opt/monitoring/env/production.env` with `chmod 600` permissions owned by `root`.
- `.env*` files strictly excluded from Git tracking via `.gitignore`.

## 5. Entity, Agent & Two-Person Controls (added 2026-11)

The role model now runs 29 roles with entity scoping. The additional
control layers, all live and verified:

- **Entity scope locks** — HOD/parent/faculty queries are pinned to
  `auth.departmentId`, `guardian_id`, or `faculty_assignments`;
  science/HSS HODs have their own `entity_scopes` rows so an EEE HOD
  never sees CSE data.
- **Two-person rule (maker-checker)** — DEBARRED/SUSPENDED academic
  flags and high-risk grants park in `pending_approvals`; the DB
  `maker_ne_checker` CHECK is the floor, `/api/sysadmin/approvals/two-person`
  is the queue. A HOD's DEBARRED write returns `{ pending: true }`
  until a Dean/Principal signs off.
- **Exam-branch separation of duties** — marks entry (faculty) ≠ result
  processing (`addl_controller_results`) ≠ result sign-off/publish
  (`controller_examinations`). No single role can both enter and
  publish a result.
- **Bounded agents** — 7 cron agents (gate-reconcile, leave-chain,
  complaint-triage, mess-reconcile, exam-eligibility-manifest,
  audit-chain, birthday-check) run inside a role context, write
  `audit_events` with `actor_type='agent'`, and never mutate outside
  that boundary.
- **Tamper-evident audit** — nightly SHA256 hash chain over
  `audit_events` (`audit_chain` + checkpoints); a broken link fires a
  critical alert. This is the integrity proof behind accreditation /
  legal export.
- **Delegation with TTL** — time-bound, scoped, revocable role grants
  (`delegations` table, `no_self_delegation` + `valid_window`
  constraints); `withAuthorization` falls back to an active delegation
  only when the native role is absent.
- **Bot surface hardening** — `/api/sysadmin/bot/anomaly` suspensions
  ledger + alerts; OPERATOR/APPROVER mutations via the bot require
  step-up confirmation (Phase-2 device-binding upgrade tracked in
  `AUTONOMOUS_OPERATIONS.md` §4.4).

Full checklists: `SECURITY_CHECKLIST.md` §6 and
`docs/IMPLEMENTATION_BLUEPRINT.md` (STEP 4–7 status).
