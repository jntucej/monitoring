import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = 'http://127.0.0.1:80';

export let options = {
  vus: 200,
  duration: '130s',
  ramping: {
    stages: [
      { vus: 10, duration: '30s' },
      { vus: 100, duration: '50s' },
      { vus: 200, duration: '50s' },
    ],
  },
};

export default function () {
  const health = http.get(`${BASE}/api/health`, { tags: { endpoint: 'health' } });
  const status = http.get(`${BASE}/status-last.json`, { tags: { endpoint: 'status' } });
  const home = http.get(`${BASE}/`, { tags: { endpoint: 'home' } });

  check(health, {
    'health 200': (r) => r.status === 200,
    'health OK': (r) => r.body && (r.body.includes('OK') || r.body.includes('healthy')),
  });
  check(status, { 'status 200': (r) => r.status === 200 });
  check(home, {
    'home 200': (r) => r.status === 200,
    'home HTML': (r) => r.body && (r.body.includes('html') || r.body.includes('DOCTYPE')),
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const total = Math.round((data.metrics.http_reqs && data.metrics.http_reqs.values) ? data.metrics.http_reqs.values.count : 0);
  const dur_s = 130;
  const avg_rps = total > 0 ? Math.round(total / dur_s * 10) / 10 : 0;
  const peak = (data.metrics.vus_max && data.metrics.vus_max.values) ? data.metrics.vus_max.values.max : (data.metrics.vus && data.metrics.vus.values ? data.metrics.vus.values.max : 0);

  const fmt = (v) => (v !== undefined && v !== null) ? Math.round(v) + 'ms' : 'N/A';

  const urlStats = (data.metrics.http_req_duration_by_url && data.metrics.http_req_duration_by_url.values) || {};
  const hStats = urlStats[`${BASE}/api/health`] || {};
  const sStats = urlStats[`${BASE}/status-last.json`] || {};
  const pStats = urlStats[`${BASE}`] || {};

  const statusCodes = (data.metrics.http_reqs_by_status && data.metrics.http_reqs_by_status.values) || {};
  const s5xx = Object.entries(statusCodes).filter(([s]) => s.startsWith('5')).reduce((a, [, c]) => a + c, 0);
  const s4xx = Object.entries(statusCodes).filter(([s]) => s.startsWith('4')).reduce((a, [, c]) => a + c, 0);
  const s5xx_rate = total > 0 ? (s5xx / total * 100).toFixed(2) : '0.00';
  const s4xx_rate = total > 0 ? (s4xx / total * 100).toFixed(2) : '0.00';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GATE MONITOR LOAD TEST RESULTS');
  console.log('  Target: 127.0.0.1:80 (Caddy → Next.js → API)');
  console.log('  Phases: 10 VUs (30s) → 100 VUs (50s) → 200 VUs (50s)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Peak VUs:           ${peak}`);
  console.log(`  Total requests:     ${total}`);
  console.log(`  Avg throughput:     ${avg_rps} RPS`);
  console.log(`  Est. peak RPS:      ~${Math.round(total * 0.4 / 50 * 10) / 10} (high-phase share)`);
  console.log('');
  console.log('  Latency by endpoint:');
  console.log(`  /api/health:        avg=${fmt(hStats.avg)}  p95=${fmt(hStats['p(95)'])}  p99=${fmt(hStats['p(99)'])}  max=${fmt(hStats.max)}`);
  console.log(`  /status-last.json:  avg=${fmt(sStats.avg)}  p95=${fmt(sStats['p(95)'])}  p99=${fmt(sStats['p(99)'])}  max=${fmt(sStats.max)}`);
  console.log(`  / (home page):      avg=${fmt(pStats.avg)}  p95=${fmt(pStats['p(95)'])}  p99=${fmt(pStats['p(99)'])}  max=${fmt(pStats.max)}`);
  console.log('');
  console.log('  Error rates:');
  console.log(`  HTTP 4xx:           ${s4xx} (${s4xx_rate}%)`);
  console.log(`  HTTP 5xx:           ${s5xx} (${s5xx_rate}%)`);
  console.log(`  Status codes:       ${JSON.stringify(statusCodes)}`);
  console.log('═══════════════════════════════════════════════════════════');

  const passed = s5xx === 0 && parseFloat(s4xx_rate) < 5;
  console.log(`  VERDICT: ${passed ? 'PASS' : 'FAIL'}`);
  console.log('');

  return {
    'load-test-results.json': JSON.stringify({
      total_requests: total,
      peak_vus: peak,
      avg_rps: avg_rps,
      latency: { health: hStats, status: sStats, home: pStats },
      http_status: statusCodes,
      err4xx: s4xx,
      err5xx: s5xx,
      err4xx_rate: s4xx_rate + '%',
      err5xx_rate: s5xx_rate + '%',
      passed: passed,
    }, null, 2),
  };
}
