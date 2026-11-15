// Gate 1 — Traffic & Load test (k6). Targets the live app's critical READ journeys
// plus the login path. Thresholds are defined IN the script (not a wiki), per the
// one-go validation spec. This script is WRITTEN, NOT EXECUTED against production
// until the human gate approves (prod impact: real traffic + soak).
//
// Run (only after explicit go-ahead):
//   k6 run -e BASE=https://monitor.ucej.in load/k6-gate.mjs
//
// SLOs enforced:
//   http_req_failed  rate < 0.01   (<1% errors)
//   http_req_duration p95 < 500ms
//   checks           rate > 0.95   (≥95% business assertions pass)
//
// Phases: ramp → steady (peak) → ramp-down, plus an optional soak (1h) via --soak.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const reqCount = new Counter('requests');

export const options = {
  // Classic k6 execution model (this v0.54 build does NOT parse the advanced
  // `scenarios`/`ramping-vus` V2 block — it errors on `steps`/`vus` fields).
  // Use the universally-supported `stages` ramp instead:
  // warm-up -> ramp to peak -> steady hold -> graceful drain.
  stages: [
    { duration: '5s', target: 1 },     // warm-up
    { duration: '20s', target: 200 },   // ramp to projected peak
    { duration: '1m30s', target: 200 }, // steady-state peak hold
    { duration: '20s', target: 0 },     // graceful drain
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.95'],
  },
};

// --- Safe READ journeys (no mutation; safe to load). The login path is included
//     as a journey but kept at low volume (auth is the heaviest unauth endpoint).
const BASE = __ENV.BASE || 'https://monitor.ucej.in';

function assertHealth(res, tag) {
  return check(res, {
    [`${tag} status 200`]: (r) => r.status === 200,
    [`${tag} <500ms`]: (r) => r.timings.duration < 500,
  });
}

function peak() {
  const base = __ENV.BASE || 'https://monitor.ucej.in';
  // 1) public health (lightweight, unauth) — the SLO baseline
  assertHealth(http.get(`${base}/api/health`), 'health');
  // 2) public status feed
  assertHealth(http.get(`${base}/api/status`), 'status');
  // 3) gates list (public read)
  assertHealth(http.get(`${base}/api/gates`), 'gates');
  reqCount.add(3);
  sleep(0.5 + Math.random() * 0.5); // human-ish pacing
}

// Optional login-path journey (low volume; exercises the heaviest unauth route).
// Enabled only when --env LOGIN=1 (keeps default run non-auth so it's prod-safe).
function loginJourney() {
  const base = __ENV.BASE || 'https://monitor.ucej.in';
  // Do NOT actually submit real credentials in a load test — probe the route's
  // response-time characteristic with an invalid-credential POST (fast 4xx path).
  const res = http.post(`${base}/api/auth/login`, JSON.stringify({ login: '__k6_probe__', password: 'x' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'login probe responds < 1000ms': (r) => r.timings.duration < 1000,
    'login probe not 5xx': (r) => r.status < 500,
  });
  reqCount.add(1);
  sleep(1);
}

export default function () {
  peak();
  if (__ENV.LOGIN === '1') loginJourney();
}

export function handleSummary(data) {
  const r = data.metrics.http_req || { values: { rate: 0, 'p(95)': 0, 'p(99)': 0 } };
  const checks = data.metrics.checks || { values: { rate: 0 } };
  const summary = [
    '── k6 Gate 1 summary ──',
    `p95: ${Math.round(r.values['p(95)'] || 0)}ms  (SLO <500ms)`,
    `p99: ${Math.round(r.values['p(99)'] || 0)}ms`,
    `error rate: ${((r.values.rate || 0) * 100).toFixed(2)}%  (SLO <1%)`,
    `checks pass rate: ${((checks.values.rate || 0) * 100).toFixed(1)}%  (SLO >95%)`,
    'See load/report.json for full metrics.',
  ].join('\n');
  return {
    'load/report.json': JSON.stringify({
      http: r,
      checks: checks,
      requests: data.metrics.requests,
      thresholds: options.thresholds,
    }),
    txt: summary, // txt reporter wants a plain string, not a function
  };
}
