# Technical Debt and Architectural Backlog

This document centralizes all comprehensive audit items, hardening recommendations, and infrastructure backlogs.

---

## AX. Cookie & Session Security

- **AX1 — Explicit Cookie Attributes**: Every `Set-Cookie` in `src/app/api/auth/*` must enforce `httpOnly: true`, `secure: true` (in production), `sameSite: "lax"`, `path: "/"`.
- **AX2 — `__Host-` Prefix**: Enforce `__Host-` prefix on secure cookies to prevent cookie-tossing attacks from subdomains.
- **AX3 — Session Fixation Guard**: Access and refresh tokens mint unique `jti` via `crypto.randomUUID()` per issuance.
- **AX4 — Logout Across All Devices**: Implemented via `POST /api/auth/logout-all`, bumping user `session_version` and revoking all database sessions.

---

## AY. API Design

- **AY1 — API Versioning**: Prefix endpoints with `/api/v1/*` with legacy backward-compatibility shims.
- **AY2 — Deprecation Headers**: Add `Deprecation` and `Sunset` headers on older routes before retirement.
- **AY3 — Idempotency Keys on Mutation Routes**: Support `Idempotency-Key` header on state-changing operations (`/api/passes`, `/api/permissions`, `/api/gate/scan`) backed by `idempotency_keys` table.
- **AY4 — `X-Request-Id` Propagation**: Ensure correlation ID is attached to both incoming headers and outgoing responses.
- **AY5 — Pagination Link Headers**: Standardize RFC 5988 `Link` headers for paginated collections (`</api/users?page=2>; rel="next"`).

---

## AZ. Migration Safety

- **AZ1 — Lock Timeouts**: Prefix DDL migrations with `SET lock_timeout = '5s'; SET statement_timeout = '60s';` to avoid blocking app transactions.
- **AZ2 — Non-Blocking Column Additions**: Ensure `ADD COLUMN ... NOT NULL` includes defaults to avoid table rewrites on Postgres.
- **AZ3 — Migration Dry-Run**: Support `npx tsx scripts/migrate.ts --dry-run` for pre-deployment schema review.
- **AZ4 — Concurrent Index Creation**: Hot tables (`movement_logs`) must use `CREATE INDEX CONCURRENTLY` outside transactions.
- **AZ5 — Rollback Pairing**: Maintain rollback migration scripts for destructive DDL operations.

---

## BA. Privacy & PII (DPDP Compliance)

- **BA1 — Automated Log Redaction**: Strip credentials, PINs, auth headers, and tokens (`redactSensitive`) in `src/lib/log.ts`.
- **BA2 — Audit Log Retention Alignment**: Enforce 30-to-90 day retention schedules for audit logs containing IP addresses or user details.
- **BA3 — Fake Test Fixtures**: Prevent production data copying; ensure fixtures strictly use synthetic data.
- **BA4 — DSAR Self-Service**: Provided via `POST /api/users/me/export` returning the complete user record bundle.
- **BA5 — Consent Records**: Track explicit, informed consent with timestamps and scopes in `consent_records` table.

---

## BB. Account Security

- **BB1 — Account Enumeration Defense**: Perform constant-time bcrypt comparisons against a dummy hash when users are not found.
- **BB2 — Centralized Password Policy**: Enforce length and complexity requirements via `src/server/policy/passwords.ts`.
- **BB3 — Leaked Password Checking**: Optional integration with Have I Been Pwned range API for breached credential rejection.
- **BB4 — New Device / IP Login Notifications**: Notify users upon logins from unrecognized IP addresses.
- **BB5 — Database-Level Privileged MFA Constraint**: Trigger on `sessions` table ensuring admin/sysadmin sessions require two-factor authentication.

---

## BC. Host & Network Hardening

- **BC1 — SSH Hardening**: Disable password auth and root login (`PasswordAuthentication no`, `PermitRootLogin no`).
- **BC2 — Firewall Configuration**: Restrict incoming traffic to ports 22, 80, and 443 via `ufw`.
- **BC3 — Docker Socket Protection**: Prevent exposing `/var/run/docker.sock` to application containers.
- **BC4 — Automatic Security Patches**: Configure `unattended-upgrades` on host VMs.
- **BC5 — NTP Synchronization**: Verify system clock synchronization via `systemd-timesyncd` to prevent TOTP drift.
- **BC6 — Container Base Digest Pinning**: Pin container image digests (`@sha256:...`).

---

## BD. Supply Chain Security

- **BD1 — Software Bill of Materials (SBOM)**: Generate CycloneDX SBOM during CI releases.
- **BD2 — Vulnerability Scanning**: Run Trivy container scanning in CI.
- **BD3 — Secret Scanning**: Enforce Gitleaks pre-commit hooks and CI scans.
- **BD4 — Dependency Audits**: Enforce `npm audit --audit-level=high` in CI pipelines.
- **BD5 — Image Signing**: Sign built container artifacts with `cosign`.

---

## BE. Advanced Testing

- **BE1 — API Contract Snapshots**: Maintain response schema contract tests for core REST routes.
- **BE2 — Performance & Load Testing**: Track p95 latency under concurrent scanning via k6 scripts.
- **BE3 — Chaos & Resilience Probes**: Verify graceful fallbacks when Redis or downstream services disconnect.
- **BE4 — Golden Schema Drift Tests**: Validate migration outputs against baseline golden schemas in CI.
- **BE5 — Property-Based Testing**: Use `fast-check` to test grammar parsers (`parseRollNumber`).

---

## BF. Operational Protocol

- **BF1 — Staging Mirror Environment**: Maintain `docker-compose.staging.yml` for release rehearsal.
- **BF2 — Canary Deployments**: Route a small percentage of ingress traffic to new revisions before complete promotion.
- **BF3 — Structured Deploy Telemetry**: Log deployment timestamps, commits, and actors into a deployment audit table.
- **BF4 — Emergency Incident Runbooks**: Document escalation protocols for 24/7 gate availability.
- **BF5 — Blameless Postmortems**: Store postmortem reports under `docs/postmortems/`.
