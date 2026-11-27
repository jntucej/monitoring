export interface NamedQuery {
  id: string;
  description: string;
  query: string;
  type: "instant" | "range";
}

// Small by design. Grows only as panels need it — no speculative entries.
export const QUERY_REGISTRY: Record<string, NamedQuery> = {
  "fleet.cpu": {
    id: "fleet.cpu",
    description: "CPU % per container",
    query: 'sum by (name) (rate(container_cpu_usage_seconds_total{name=~"gate_.*|mon_.*"}[5m])) * 100',
    type: "instant",
  },
  "fleet.memory": {
    id: "fleet.memory",
    description: "Working set bytes per container",
    query: 'sum by (name) (container_memory_working_set_bytes{name=~"gate_.*|mon_.*"})',
    type: "instant",
  },
  "fleet.restarts": {
    id: "fleet.restarts",
    description: "Restart count over last 1h",
    query: 'changes(container_start_time_seconds{name=~"gate_.*|mon_.*"}[1h])',
    type: "instant",
  },
  "fleet.up": {
    id: "fleet.up",
    description: "Container liveness (1=up)",
    query: 'count by (name) (container_last_seen{name=~"gate_.*|mon_.*"})',
    type: "instant",
  },
  "host.cpu": {
    id: "host.cpu",
    description: "Host CPU utilization % (node_exporter)",
    query: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
    type: "instant",
  },
  "host.memory": {
    id: "host.memory",
    description: "Host memory utilization % (node_exporter)",
    query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
    type: "instant",
  },
  "host.disk": {
    id: "host.disk",
    description: "Root filesystem usage % (node_exporter)",
    query: '(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100',
    type: "instant",
  },
  "host.load1": {
    id: "host.load1",
    description: "Host 1m load average (node_exporter)",
    query: "node_load1",
    type: "instant",
  },
  "pg.up": {
    id: "pg.up",
    description: "PostgreSQL exporter liveness",
    query: "pg_up",
    type: "instant",
  },
  "pg.connections": {
    id: "pg.connections",
    description: "Active PostgreSQL connections",
    query: "sum(pg_stat_activity_count)",
    type: "instant",
  },
  "targets.up": {
    id: "targets.up",
    description: "Prometheus scrape targets up",
    query: "up",
    type: "instant",
  },
  // HTTP throughput / latency (from the app's /api/metrics exposition,
  // scraped into Prometheus). Backs the DevOps DualThroughputCurve:
  //   fleet.http_rate   — requests/sec over the last 5m (range)
  //   fleet.http_errors — 5xx rate over the last 5m (range)
  //   fleet.http_p95    — response-time p95 in ms (range, sampled)
  //   fleet.http_total  — total requests over a window (instant, gauge-ish)
  "fleet.http_rate": {
    id: "fleet.http_rate",
    description: "API requests/sec over the last 5m",
    query: "sum(rate(api_requests_total[5m]))",
    type: "range",
  },
  "fleet.http_errors": {
    id: "fleet.http_errors",
    description: "API 5xx errors/sec over the last 5m",
    query: "sum(rate(api_errors_total[5m]))",
    type: "range",
  },
  "fleet.http_p95": {
    id: "fleet.http_p95",
    description: "API p95 response time (ms), sampled",
    query: "avg(api_response_time_p95_ms)",
    type: "range",
  },
  "fleet.http_total": {
    id: "fleet.http_total",
    description: "Total API requests (1h window)",
    query: "sum(api_requests_total)",
    type: "instant",
  },
};

export function getNamedQuery(id: string): NamedQuery | null {
  return QUERY_REGISTRY[id] || null;
}
