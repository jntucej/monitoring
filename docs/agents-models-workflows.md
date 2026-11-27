# Gate Monitor — Agents, Models & Autonomous Workflows (Design + Reality Check)

This document maps the **agentic + model + autonomous-operations** layer of
Gate Monitor to what is actually running on this server, distinguishes
implemented vs. aspirational, and records the fixes + open items found during
audit (2026-11-27). Read `docs/AUTONOMOUS_OPERATIONS.md` for the original
playbook; this is the *as-built* companion.

## 1. The three layers

| Layer | What it is | Where | Status on this server |
|---|---|---|---|
| **Ops-agent (SOAR)** | Restricted infrastructure operations agent. Worker-side, allowlisted ops only. | `worker/ops-agent.mjs` (binds `127.0.0.1:3002` inside `gate_worker`) | **Live** — reachable, 7 ops registered |
| **Model runtime (M1/M2/M3)** | Local LLM workers: M1 OCR-classify (qwen3:1.7b), M2 document-intel, M3 document extraction (qwen2.5:3b). Ollama-backed. | `model-runtime/` (repo root, `@model-runtime` alias) | **Ollama is installed + running**, but **the model runtime cannot reach it** (see §4 bug) |
| **Autonomous control loops** | Cron agents that close operational gaps without a human: gate reconcile, pass expiry, mess reconcile, complaint triage, exam eligibility, + the SOAR ops. | `worker/jobs/*` + `/api/cron/*` routes | **Live** — all scheduled; the "agents" are cron jobs + the ops-agent, not LLM agents |

## 2. The Ops-agent (auto-repair mechanism) — VERIFIED

The `restart-container-on-crash` + "fix automatically" capability you asked
about lives here. Facts confirmed live:

- **Restart primitive:** every `gate_*` container uses `restart: always` with
  Docker's built-in **exponential backoff** (100ms→5min cap). A crashed
  container self-restarts; a crash-loop self-throttles instead of hammering.
- **Healthchecks:** `gate_web` (`/api/health`, 10s) + `gate_postgres`
  (`pg_isready`) detect hung-but-alive processes and mark them unhealthy.
- **Alert chain (live end-to-end):** Prometheus rules
  (`web_process_down`, `worker_http_health_down`, `container_oom_killed`,
  PG memory>85%) → Alertmanager → `/api/webhooks/alertmanager` → **Telegram**
  (critical → `TELEGRAM_CRITICAL_CHAT_ID`). `curl /api/v2/alerts` = `[]`.
- **SOAR ops** the ops-agent exposes (allowlisted, no unrestricted fs/SQL,
  docker ops gated):

  | Op | Purpose | Functional? |
  |---|---|---|
  | `host_diagnostics` | CPU/mem/disk/uptime snapshot | ✅ |
  | `verify_latest_backup` | integrity-check the newest backup | ✅ |
  | `refresh_infra_snapshot` | update the last-known-good status | ✅ |
  | `list_backups` | enumerate backup set | ✅ |
  | `retry_failed_notifications` | re-dispatch stuck SMS/notification queue | ✅ |
  | `restart_container` | restart a gate_* container | ⚠️ **not functional** (see below) |
  | `get_container_logs` | tail a container's logs | ⚠️ **not functional** (see below) |

  `restart_container` / `get_container_logs` deliberately return
  `OPERATION_UNAVAILABLE`: the worker image has no docker CLI and the `nextjs`
  user can't read `/var/run/docker.sock` (root:docker owned). The intended
  upgrade is a **restricted docker broker** — `docs/future-docker-broker.md`.
  This is a deliberate security boundary, not a bug.

### Bug found + fixed (commit `5e35cca9`)
`/api/sysadmin/operations/*`, `/agent-status`, and `/usb-discovery` all
hardcoded the ops-agent host as `http://worker:3002`. In this topology the
web container can only resolve the container_name **`gate_worker`**, not the
bare service name `worker` (`ENOTFOUND`). So the entire SysAdmin operations
console reported the agent unreachable even though it was healthy (7 ops).
**Fixed** both routes + usb-discovery to default to `http://gate_worker:3002`
(overridable via `OPS_AGENT_URL`). Verified: `gate_worker:3002/health` →
`{status:healthy, ops:7}`.

### Crash-loop diagnosability (commit `f7899c5b`)
The KIOSK boot-guard (`src/instrumentation.ts`) hard-exits when
`KIOSK_SESSION_REQUIRE_PIN`/`TRUSTED_KIOSK_IPS` are unset (correct fail-closed
security). Under `restart: always` that becomes a **silent crash-loop** — the
13:51–14:00 incident. Now the guard writes `/tmp/gate-web-boot-failure.txt`
*before* exiting, so the operator / a health probe sees **why** instead of a
silent spin. The security guard is kept; only diagnosability was added.

## 3. The Model runtime (M1/M2/M3) — Ollama is present but UNREACHABLE

- **What it is:** `model-runtime/manager.ts` runs a 3-model lifecycle
  (start→idle→stop) against Ollama: M1 = `qwen3:1.7b` (OCR/short classify),
  M3 = `qwen2.5:3b` (document extraction), M2 = document-intelligence. The
  app calls it via `createAiRuntime()` in `/api/ai/documents` +
  `/api/circulars/ocr-classify`.
- **On this server:** Ollama is a **systemd service** (`Restart=always`),
  running, with `qwen3:1.7b`, `qwen2.5:3b`, `deepseek-r1:1.5b`,
  `gemma3:270m` present. (Note: this is *newer* than the older "no Ollama"
  note — Ollama was added since.)
- **Bug (open — needs host/config authorization, §5):** Ollama listens on
  **`127.0.0.1:11434` only** (loopback). The model runtime defaults to
  `http://ollama:11434`, which is **not a resolvable docker service**
  (`ENOTFOUND` from both web and worker). `host.docker.internal:11434` is
  also unreachable from the worker (the worker has no `extra_hosts` mapping;
  only `web` + `llm-proxy` do). **Result: every AI feature is silently
  broken** — document extraction + circular OCR-classify time out.

## 4. The autonomous control loops (the "agents" that actually run)

These are **cron jobs + SOAR ops, not LLM agents** — they run on a schedule
and escalate exceptions. All confirmed present + scheduled:

| Loop | Route / job | Cadence | Scope | What it closes |
|---|---|---|---|---|
| Gate reconcile | `/api/cron/gate-reconcile` | */5 | operator | auto-resolve clean scans, prep operator prompts (offline JWT verifier = Phase 2) |
| Pass expiry | `/api/cron/expire-passes` | 15m | system | zero-touch close of stale passes |
| Mess reconcile | `/api/cron/mess-reconcile` | daily | mess_incharge | hash-chained token↔meal-count ledger (dup-scan = idempotent via ON CONFLICT) |
| Complaint triage | `/api/cron/complaint-triage` | */30 | supervisor | classify T1/T2/T3 + route + dedupe + SLA-escalate |
| Exam eligibility | `/api/cron/exam-eligibility-manifest` | 22:00 | OIE | Ed25519-signed offline eligibility manifest |
| Backup maintenance | `worker/jobs/backup_maintenance.js` | scheduled | sysadmin | rotation/verify |
| Notification retry | SOAR `retry_failed_notifications` | on-demand | sysadmin | re-dispatch stuck SMS/Telegram queue |

**Agent boundary rule (enforced):** every autonomous actor writes
`actor_type='agent'` audit events and acts **inside the requesting role's
RBAC + RLS boundary** — never above it, never via a service account that
bypasses RLS. Phase-2 upgrade path is SPIFFE/OPA mTLS identity.

## 5. Open items (authorization-gated)

These are the real gaps. None are started without your sign-off; each is a
host or compose change.

1. **AI / model-runtime reachability** (the biggest one — all AI is dead
   today). Fix:
   - Make Ollama reachable by the containers: set a systemd drop-in
     `Environment="OLLAMA_HOST=0.0.0.0:11434"` (or bind to the host's
     routable IP) and `systemctl restart ollama`. **Security:** Ollama has
     no auth by default — binding it off-loopback exposes model control to
     the network. Recommended: bind to the **Tailscale** interface
     (`OLLAMA_HOST=100.122.7.62:11434`) so it's reachable only via Tailscale,
     not the public LAN/WAN.
   - Add `extra_hosts: ["host.docker.internal:host-gateway"]` to the **worker**
     service (web + llm-proxy already have it).
   - Set `.env`: `AI_M1_URL=http://<reachable-ollama-host>:11434` and
     `AI_M3_URL=...`, then `docker compose up -d --force-recreate web worker`.
2. **`restart_container` / `get_container_logs`** (the auto-repair you asked
   about) are intentionally non-functional. To make them work: implement the
   **restricted docker broker** in `docs/future-docker-broker.md` (a
   socket-bridge sidecar with an allowlisted container set) — this is a
   security design decision, not a one-liner.
3. **Offline gate verifier + Aadhaar-anchored enrollment** (the two physical
   integrations still open per `AUTONOMOUS_OPERATIONS.md` §7).

## 6. How it all fits

```
[Crash / misconfig] --restart:always--> container restarts (backoff-throttled)
     |
     +-- healthcheck (web /api/health, pg_isready) marks UNHEALTHY
     |        \
     |         +-- Prometheus rule (web_process_down, worker_http_health_down)
     |                \
     |                 +-- Alertmanager -> /api/webhooks/alertmanager -> TELEGRAM
     |
     +-- KIOSK boot-guard writes /tmp/gate-web-boot-failure.txt (diagnosable loop)

[SysAdmin console] --/api/sysadmin/operations--> ops-agent (gate_worker:3002)
     |   verify_latest_backup / refresh_infra_snapshot / host_diagnostics / retry_failed_notifications  [functional]
     |   restart_container / get_container_logs  [OPERATION_UNAVAILABLE -> future docker broker]

[AI features] --/api/ai/* --model-runtime--> Ollama (M1 qwen3:1.7b, M3 qwen2.5:3b)
     -- currently UNREACHABLE from containers (loopback bind + missing host-gateway) -> see §5.1
```

## 7. Verification log (this audit)

- `tsc` clean; `next build` green.
- `gate_worker:3002/health` → `healthy`, 7 ops (the ops-agent is up).
- Ollama present + running; `127.0.0.1:11434` loopback-only; containers cannot
  reach it (`ollama:11434` ENOTFOUND, worker `host.docker.internal:11434` ENOTFOUND).
- Restart policies + healthchecks + Telegram alert chain confirmed live.
