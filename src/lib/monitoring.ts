const PROM_URL = process.env.MONITORING_PROM_URL || "http://mon_prometheus:9090";
const PROM_FALLBACK_URL = process.env.GATE_PROM_URL || "http://gate_prometheus:9090";
const LOKI_URL = process.env.MONITORING_LOKI_URL || "http://mon_loki:3100";

const ALLOWED_PREFIXES = [
  "node_", "container_", "pg_", "up", "prometheus_", "loki_", "process_", "go_",
];

export function isAllowedPromQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (/\b(delete|drop|truncate|admin)\b/i.test(q)) return false;
  return ALLOWED_PREFIXES.some((p) => q.includes(p));
}

async function monFetch(url: string, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`monitoring upstream ${res.status}: ${text.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function promQuery(query: string, time?: string) {
  if (!isAllowedPromQuery(query)) throw new Error("QUERY_NOT_ALLOWED");
  const params = new URLSearchParams({ query });
  if (time) params.set("time", time);
  try {
    return await monFetch(`${PROM_URL}/api/v1/query?${params.toString()}`);
  } catch {
    return await monFetch(`${PROM_FALLBACK_URL}/api/v1/query?${params.toString()}`);
  }
}

export async function promQueryRange(query: string, start: string, end: string, step = "30s") {
  if (!isAllowedPromQuery(query)) throw new Error("QUERY_NOT_ALLOWED");
  const params = new URLSearchParams({ query, start, end, step });
  try {
    return await monFetch(`${PROM_URL}/api/v1/query_range?${params.toString()}`);
  } catch {
    return await monFetch(`${PROM_FALLBACK_URL}/api/v1/query_range?${params.toString()}`);
  }
}

export async function lokiQueryRange(query: string, start: string, end: string, limit = 5000) {
  const capped = Math.min(Math.max(1, limit), 5000);
  const params = new URLSearchParams({ query, start, end, limit: String(capped), direction: "backward" });
  return monFetch(`${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`);
}

export async function lokiLabelValues(label = "container") {
  return monFetch(`${LOKI_URL}/loki/api/v1/label/${encodeURIComponent(label)}/values`);
}

export const MONITORING_GRAFANA_URL =
  process.env.MONITORING_GRAFANA_URL || "http://100.122.7.62:3001";

/**
 * Grafana credentials for the SERVER-SIDE proxy only. The dedicated read-only
 * "viewer" service-account token (or basic-auth user) is held here in process
 * env and NEVER sent to the browser — the iframe points at /api/sysadmin/grafana/*
 * which streams the dashboard with these credentials server-side.
 */
const GRAFANA_TOKEN = process.env.MONITORING_GRAFANA_TOKEN || "";
const GRAFANA_BASIC_USER = process.env.MONITORING_GRAFANA_USER || "";
const GRAFANA_BASIC_PASS = process.env.MONITORING_GRAFANA_PASS || "";

function grafanaAuthHeadersInternal(): Record<string, string> {
  const h: Record<string, string> = {};
  if (GRAFANA_TOKEN) h["Authorization"] = `Bearer ${GRAFANA_TOKEN}`;
  else if (GRAFANA_BASIC_USER) {
    h["Authorization"] =
      "Basic " + Buffer.from(`${GRAFANA_BASIC_USER}:${GRAFANA_BASIC_PASS}`).toString("base64");
  }
  return h;
}
export function grafanaAuthHeaders(): Record<string, string> {
  return grafanaAuthHeadersInternal();
}

/**
 * Probe Grafana's /api/health to determine embeddability. Returns a structured
 * result so the UI can render an explicit "unavailable" state (never fake
 * data). Never throws.
 */
export async function grafanaHealth(timeoutMs = 4000): Promise<{
  reachable: boolean;
  version?: string;
  commit?: string;
  error?: string;
}> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${MONITORING_GRAFANA_URL}/api/health`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: grafanaAuthHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { reachable: false, error: `grafana ${res.status}: ${text.slice(0, 160)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { version?: string; commit?: string };
    return { reachable: true, version: json.version, commit: json.commit };
  } catch (e) {
    return {
      reachable: false,
      error: e instanceof Error ? e.message : "grafana unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort client error reporting. Posts to /api/dev/contact so the
 * developer gets notified; never throws, never blocks the UI.
 * Guarded with a per-session cap to avoid a spammy error-boundary loop.
 */
const CLIENT_ERROR_CAP = 5;
let clientErrorReports = 0;

export function reportClientError(
  error: Error & { digest?: string },
  ctx?: { route?: string; component?: string; digest?: string }
): void {
  if (clientErrorReports >= CLIENT_ERROR_CAP) return;
  clientErrorReports += 1;
  const msg = `[client-error] ${ctx?.component || "component"} @ ${ctx?.route || "route"}: ${
    error?.message || "unknown error"
  }${ctx?.digest ? ` (digest ${ctx.digest})` : ""}`;
  try {
    fetch("/api/dev/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "error",
        subject: `Client error: ${ctx?.component || "unknown"}`,
        message: msg,
      }),
      keepalive: false,
    }).catch(() => {
      /* swallow: reporting must never crash the app */
    });
  } catch {
    /* ignore */
  }
}
