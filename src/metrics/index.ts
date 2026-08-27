/**
 * Prometheus Performance & Operational Metrics Collector
 */

interface HistogramData {
  sum: number;
  count: number;
}

class MetricsRegistry {
  private requestsTotal = new Map<string, number>();
  private requestDurations = new Map<string, HistogramData>();
  private activeSessionsCount = 0;
  private gateScanTotal = new Map<string, number>();

  incHttpRequest(method: string, path: string, status: number) {
    const key = `${method}:${path}:${status}`;
    this.requestsTotal.set(key, (this.requestsTotal.get(key) || 0) + 1);
  }

  observeHttpRequestDuration(method: string, path: string, durationSeconds: number) {
    const key = `${method}:${path}`;
    const current = this.requestDurations.get(key) || { sum: 0, count: 0 };
    this.requestDurations.set(key, {
      sum: current.sum + durationSeconds,
      count: current.count + 1,
    });
  }

  setActiveSessions(count: number) {
    this.activeSessionsCount = count;
  }

  incGateScan(gateId: string, direction: string) {
    const key = `${gateId}:${direction}`;
    this.gateScanTotal.set(key, (this.gateScanTotal.get(key) || 0) + 1);
  }

  generatePrometheusText(): string {
    const lines: string[] = [];

    // HTTP Requests Total
    lines.push("# HELP http_requests_total Total number of HTTP requests processed.");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, count] of this.requestsTotal.entries()) {
      const [method, path, status] = key.split(":");
      lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
    }

    // HTTP Request Durations
    lines.push("\n# HELP http_request_duration_seconds HTTP request latency histogram.");
    lines.push("# TYPE http_request_duration_seconds histogram");
    for (const [key, data] of this.requestDurations.entries()) {
      const [method, path] = key.split(":");
      lines.push(`http_request_duration_seconds_sum{method="${method}",path="${path}"} ${data.sum.toFixed(4)}`);
      lines.push(`http_request_duration_seconds_count{method="${method}",path="${path}"} ${data.count}`);
    }

    // Active Sessions
    lines.push("\n# HELP active_sessions Current active user sessions.");
    lines.push("# TYPE active_sessions gauge");
    lines.push(`active_sessions ${this.activeSessionsCount}`);

    // Gate Scans
    lines.push("\n# HELP gate_scan_total Total gate scan events processed.");
    lines.push("# TYPE gate_scan_total counter");
    for (const [key, count] of this.gateScanTotal.entries()) {
      const [gateId, direction] = key.split(":");
      lines.push(`gate_scan_total{gate_id="${gateId}",direction="${direction}"} ${count}`);
    }

    return lines.join("\n");
  }
}

export const metricsRegistry = new MetricsRegistry();
