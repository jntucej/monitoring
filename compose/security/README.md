# CIS Ubuntu 22.04 LTS v3.0.0 & Advanced Controls Deployment Guide

This directory contains the production-grade security configuration files aligned with the **CIS Ubuntu 22.04 LTS v3.0.0 Benchmark** and the **8 Advanced Controls (Defense-in-Depth)**.

## Architecture & Host Matrix
- **Production Host:** Bare-metal Ubuntu 22.04 LTS managed via systemd.
- **Development/Lab Host:** Windows 11 + WSL2 Ubuntu 22.04 + Docker Desktop.
  *Note on WSL2:* Never apply kernel sysctl hardening (`sysctl-99-hardening.conf`) on WSL2 hosts because all WSL distros share Microsoft's kernel. Docker Desktop VM access bypasses engine settings (`wsl -d docker-desktop`). Production workloads MUST remain on bare-metal Ubuntu.

---

## 1. Advanced Controls Implemented

1. **Kernel-level Runtime Enforcement (Falco eBPF):**
   - Configured in `compose/security/falco-rules.yaml`.
   - Scoped to `gate_web` and `gate_llm_proxy` containers to prevent execve noise while actively detecting and alerting on reverse shells, sensitive file reads (`/etc/shadow`), and unexpected outbound network connections.

2. **Workload Identity & mTLS:**
   - Architecture defined in `compose/security/step-ca.yaml`.
   - Internal private CA using Ed25519 and TLS 1.3 for container-to-container mutual TLS and client certificate verification (`verify-full`).

3. **Dynamic & Auto-Rotating Database Credentials:**
   - Automated via `scripts/rotate-db-creds.sh`.
   - Periodically rotates `gate_app` passwords with zero-downtime execution and strips `INHERIT` permissions.

4. **Database Activity Monitoring (pgaudit):**
   - Configured in `compose/security/pgaudit.conf`.
   - Scoped strictly to `ddl, role, write` on sensitive relations to maintain <1% runtime overhead and capture bound parameters for injection forensics without disk saturation.

5. **Sender-Constrained Tokens (RFC 9449 DPoP):**
   - Implemented in `src/lib/dpop.ts`, `src/lib/auth-token.ts`, `src/app/api/auth/login/route.ts`, and `src/app/api/auth/refresh/route.ts`.
   - Cryptographically binds refresh tokens to client-held key thumbprints (`cnf.jkt`) and validates nonces with replay protection; kiosk and machine accounts remain cleanly exempt.

6. **LLM & RAG Containment:**
   - Ingestion sanitization in `src/lib/rag/ingest.ts` and `scripts/ingest-kb.mjs` (strips zero-width unicode, HTML comments, and hidden CSS tricks).
   - Strict structural delimiters (`<untrusted_context>`) and anti-jailbreak directives in `src/lib/rag/prompt.ts`.
   - Egress allowlist on `scripts/llm-proxy.mjs` allowing only `/v1/chat/completions`, `/v1/embeddings`, `/v1/models`.
   - Network isolation: Moved `llm-proxy` from `network_mode: host` to the internal Docker bridge network (`docker-compose.yml`) with loopback port mapping `127.0.0.1:8080:8080`.

7. **Deception Tripwires (Honeytokens):**
   - Implemented in `src/lib/deception.ts`, `src/app/api/auth/login/route.ts`, `src/lib/attachment-storage.ts`, and `scripts/master-backup.sh`.
   - High-fidelity tripwires across 4 vectors: decoy `.env.bak` / credential file reads, canary sysadmin login identifier, canary audit chain sentinel, and fake secondary S3 backup keys.

8. **UEBA (User & Entity Behavior Analytics):**
   - Materialized view and statistical anomaly detection views in `database/migrations/20261231000001_ueba_baselines.sql`.
   - Inspectable via sysadmin API endpoint `/api/admin/ueba` with per-role baselining (z-score volume spike detection, off-hours privileged operations, and impossible travel detection).

---

## 2. Host CIS Hardening Assets

- **SSH Configuration:** `compose/security/sshd-99-hardening.conf` (disable root login, disable passwords, enforce publickey, MaxAuthTries 3).
- **Kernel Sysctl:** `compose/security/sysctl-99-hardening.conf` (KSPP recommended settings, yama ptrace scope 2, disable unprivileged BPF, reverse path filtering).
- **Auditd Rules:** `compose/security/auditd-gate-monitor.rules` (tracks identity, `.env`, backup directories, Docker socket, and root execve).
- **AIDE Integrity Check:** `compose/security/aide-gate-monitor.conf` (excludes Docker overlay churn and logs to prevent false-positive alert fatigue).
- **Host Firewall (UFW):** `scripts/setup-ufw.sh` (`ufw default deny routed` to block Docker bridge bypass).
- **Caddy Structured Logging & CrowdSec:** `compose/security/crowdsec-caddy.yaml` (native JSON parser avoiding regex drift).
