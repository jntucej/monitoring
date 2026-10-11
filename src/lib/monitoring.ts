const PROM_URL = process.env.MONITORING_PROM_URL || "http://mon_prometheus:9090";
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
  return monFetch(`${PROM_URL}/api/v1/query?${params.toString()}`);
}

export async function promQueryRange(query: string, start: string, end: string, step = "30s") {
  if (!isAllowedPromQuery(query)) throw new Error("QUERY_NOT_ALLOWED");
  const params = new URLSearchParams({ query, start, end, step });
  return monFetch(`${PROM_URL}/api/v1/query_range?${params.toString()}`);
}

export async function lokiQueryRange(query: string, start: string, end: string, limit = 5000) {
  const capped = Math.min(Math.max(1, limit), 5000);
  const params = new URLSearchParams({ query, start, end, limit: String(capped) });
  return monFetch(`${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`);
}

export const MONITORING_GRAFANA_URL =
  process.env.MONITORING_GRAFANA_URL || "http://100.122.7.62:3001";

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
