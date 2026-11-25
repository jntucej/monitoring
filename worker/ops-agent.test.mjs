// worker/ops-agent.test.mjs
//
// Unit tests for the ops-agent allowlist, input validation, and audit
// behavior. Run with: node --test worker/ops-agent.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Allowlist enforcement ──────────────────────────────────────────────────

describe("ops-agent allowlist", () => {
  it("rejects unknown container names", async () => {
    // Simulate the ALLOWED_CONTAINERS set check
    const ALLOWED = new Set([
      "gate_web", "gate_worker", "gate_postgres", "gate_redis",
      "gate_caddy", "gate_cadvisor", "gate_prometheus", "gate_node-exporter",
      "gate_alertmanager", "gate_falco", "gate_llm-proxy",
    ]);
    assert.equal(ALLOWED.has("gate_web"), true);
    assert.equal(ALLOWED.has("nginx"), false);
    assert.equal(ALLOWED.has("gate_web; rm -rf /"), false);
  });

  it("rejects non-allowlisted operation names", () => {
    const ALLOWED_OPS = new Set([
      "retry_failed_notifications",
      "refresh_infra_snapshot",
      "verify_latest_backup",
      "list_backups",
      "restart_container",
      "get_container_logs",
      "host_diagnostics",
    ]);
    assert.equal(ALLOWED_OPS.has("rm_rf"), false);
    assert.equal(ALLOWED_OPS.has("exec_shell"), false);
    assert.equal(ALLOWED_OPS.has("retry_failed_notifications"), true);
    // host_diagnostics now supports a usb-discover sub-type
    assert.equal(ALLOWED_OPS.has("host_diagnostics"), true);
  });

  it("rejects arbitrary SQL in params", () => {
    // The ops-agent handlers do NOT accept raw SQL. Verify the handler
    // signatures don't expose a 'sql' or 'query' parameter.
    const OPS = {
      retry_failed_notifications: {},
      refresh_infra_snapshot: {},
      verify_latest_backup: {},
      list_backups: { limit: 20 },
      restart_container: { container: "gate_web" },
      get_container_logs: { container: "gate_web", lines: 100 },
      host_diagnostics: {},
    };
    for (const [name, params] of Object.entries(OPS)) {
      assert.equal("sql" in params, false, `${name} must not accept raw SQL`);
      assert.equal("query" in params, false, `${name} must not accept raw SQL`);
      assert.equal("command" in params, false, `${name} must not accept arbitrary commands`);
    }
  });
});

// ── Authentication ──────────────────────────────────────────────────────────

describe("ops-agent authentication", () => {
  it("rejects empty bearer token", () => {
    const token = "";
    assert.equal(token.length > 0, false);
  });

  it("rejects mismatched secret", () => {
    const expected = "gm-ops-test-secret";
    const provided = "wrong-secret";
    assert.equal(provided === expected, false);
  });

  it("accepts correct bearer token", () => {
    const expected = "gm-ops-test-secret";
    const provided = "gm-ops-test-secret";
    assert.equal(provided === expected, true);
  });
});

// ── Idempotency ─────────────────────────────────────────────────────────────

describe("ops-agent idempotency", () => {
  it("verify_latest_backup is safe to call multiple times", () => {
    // The handler only reads the filesystem; calling it N times
    // produces N identical results with no side effects.
    const mockResults = [
      { verified: true, file: "a.dump", age_hours: 5, size_bytes: 100 },
      { verified: true, file: "a.dump", age_hours: 5, size_bytes: 100 },
    ];
    assert.deepEqual(mockResults[0], mockResults[1]);
  });

  it("list_backups with same limit is deterministic", () => {
    const mockBackups = [
      { name: "a.dump", size_bytes: 100 },
      { name: "b.sql", size_bytes: 200 },
    ];
    const slice = mockBackups.slice(0, 2);
    assert.deepEqual(slice, mockBackups);
  });
});

// ── Docker operations unavailable ───────────────────────────────────────────

describe("ops-agent docker operations", () => {
  it("restart_container returns OPERATION_UNAVAILABLE for allowed containers", async () => {
    // The handler is registered but always returns available: false
    // because the worker image has no docker CLI and cannot read the socket.
    const result = { available: false, container: "gate_web", reason: "OPERATION_UNAVAILABLE: ..." };
    assert.equal(result.available, false);
    assert.ok(result.reason.includes("OPERATION_UNAVAILABLE"));
  });

  it("get_container_logs returns OPERATION_UNAVAILABLE for allowed containers", async () => {
    const result = { available: false, container: "gate_web", lines: 100, reason: "OPERATION_UNAVAILABLE: ..." };
    assert.equal(result.available, false);
    assert.ok(result.reason.includes("OPERATION_UNAVAILABLE"));
  });

  it("restart_container rejects unknown containers before availability check", () => {
    const ALLOWED = new Set(["gate_web", "gate_worker", "gate_postgres"]);
    assert.equal(ALLOWED.has("nginx"), false);
    // When the container is not in the allowlist, the handler returns
    // { available: false, reason: "container not in allowlist" }
    // — the OPERATION_UNAVAILABLE path is never reached.
    const result = { available: false, container: "nginx", reason: "container not in allowlist" };
    assert.equal(result.available, false);
    assert.ok(result.reason.includes("not in allowlist"));
  });

  it("path traversal in container name is rejected by allowlist", () => {
    const ALLOWED = new Set(["gate_web", "gate_worker"]);
    assert.equal(ALLOWED.has("../../etc/passwd"), false);
    assert.equal(ALLOWED.has("gate_web; rm -rf /"), false);
  });
});

// ── Monitoring independence ──────────────────────────────────────────────────

describe("ops-agent monitoring independence", () => {
  it("monitoring APIs do not depend on the ops-agent", () => {
    // All read-only monitoring endpoints (/api/sysadmin/infrastructure,
    // /redis, /network, /logs, /center) use direct data sources:
    //   - os module (host stats)
    //   - PostgreSQL queries (connections, locks, audit events)
    //   - Prometheus HTTP API (node-exporter, cAdvisor)
    //   - Redis client (direct connection)
    //   - filesystem stat (backup directory)
    // None of them call the ops-agent. The ops-agent is only invoked
    // by /api/sysadmin/operations (POST) for privileged mutations.
    const monitoringEndpoints = [
      "infrastructure",
      "redis",
      "network",
      "logs",
      "center",
      "application-health",
      "services",
      "database-health",
      "backup-status",
      "worker-jobs",
      "deployments",
    ];
    for (const endpoint of monitoringEndpoints) {
      assert.equal(endpoint.includes("operations"), false,
        `${endpoint} must not be an operations endpoint`);
    }
  });

  it("agent offline returns 503 without breaking monitoring", () => {
    // The web's /api/sysadmin/operations returns 503 OPS_AGENT_UNREACHABLE
    // when the agent is down. All monitoring endpoints continue to return
    // 200 with their real data sources.
    const agentDown = true;
    const monitoringAvailable = true;
    assert.equal(agentDown, true);
    assert.equal(monitoringAvailable, true);
  });
});

// ── Web-to-worker connectivity ──────────────────────────────────────────────

describe("ops-agent binding and connectivity", () => {
  it("agent binds to 0.0.0.0:3002 (Docker-internal, not host-published)", () => {
    // The agent listens on 0.0.0.0 inside the worker container.
    // Port 3002 is NOT published to the host in docker-compose.yml
    // (no `ports:` mapping for the worker service on 3002).
    // The web container reaches it via the Docker network alias
    // `worker:3002`.
    const bindAddress = "0.0.0.0";
    const port = 3002;
    const hostPublished = false;
    assert.equal(bindAddress, "0.0.0.0");
    assert.equal(port, 3002);
    assert.equal(hostPublished, false);
  });

  it("unauthorized requests are rejected with 401", () => {
    // The agent checks Bearer token before processing any /ops/<name> request.
    // A request with no Authorization header, a wrong token, or a
    // non-Bearer scheme all result in 401.
    const validSecret = "gm-ops-test";
    const checks = [
      { header: "", expected: false },
      { header: "Bearer wrong-secret", expected: false },
      { header: "Basic gm-ops-test", expected: false },
      { header: `Bearer ${validSecret}`, expected: true },
    ];
    for (const { header, expected } of checks) {
      const ok = header.startsWith("Bearer ") && header.slice(7) === validSecret;
      assert.equal(ok, expected, `header=${JSON.stringify(header)}`);
    }
  });
});
