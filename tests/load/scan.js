// k6 load test for /api/gate/scan — single app instance capacity check.
//
// Run:
//   TOKEN=<operator JWT> k6 run tests/load/scan.js
//
// The review's capacity target: a 5,000-student campus peaks at ~2.8 scans/sec
// during a 30-minute gate-open window. This test sustains 10, 50, then 100
// scans/sec and asserts p95 < 200ms / p99 < 500ms / <0.1% failures. If p95
// exceeds 200ms at 50/sec, raise PG_MAX_POOL_SIZE or add pgbouncer.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.TOKEN;
const GATE_ID = __ENV.GATE_ID;
const ROLL = __ENV.ROLL || "25JJ1A0201";

if (!TOKEN || !GATE_ID) {
  throw new Error("Set TOKEN (operator JWT) and GATE_ID env vars before running.");
}

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // warm-up, ~3.5x real campus peak
    { duration: "2m",  target: 50 },   // design target: 18x real campus peak
    { duration: "1m",  target: 100 },  // 2x design target
    { duration: "30s", target: 0 },    // cooldown
  ],
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"],
    http_req_failed:   ["rate<0.001"],
  },
};

export default function () {
  // Alternate IN/OUT so we exercise both directions; use distinct clientEventIds
  // so the dedupe index (idx_movement_logs_dedup) does not short-circuit most
  // requests to is_duplicate=true (which would make the test measure the
  // dedupe path, not the write path we care about).
  const direction = __ITER % 2 === 0 ? "IN" : "OUT";
  const payload = JSON.stringify({
    roll: ROLL,
    direction,
    gateId: GATE_ID,
    entryType: "hosteller",
    clientEventId: crypto.randomUUID(),
    isManual: false,
  });
  const res = http.post(
    `${BASE}/api/gate/scan`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );
  // 409 (dedupe: same student+direction already recorded in the window) is a
  // valid scan-path outcome, not a failure. 429 means the rate limit tripped
  // — a real finding. 5xx / network errors are failures.
  check(res, {
    "status 200 or 409 (dedupe)": (r) => r.status === 200 || r.status === 409,
  });
  sleep(0.05);
}

export function handleSummary(data) {
  return {
    "load-test-report.md": `# /api/gate/scan load test — ${new Date().toISOString()}

\`\`\`json
${JSON.stringify(
  {
    "http_req_duration": data.metrics.http_req_duration,
    "http_req_failed": data.metrics.http_req_failed,
    "checks": data.metrics.checks,
    "vus": data.metrics.vus,
  },
  null,
  2
)}
\`\`\`
`,
  };
}
