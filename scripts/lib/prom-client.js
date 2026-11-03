// Minimal Prometheus instant-query client for worker jobs.
//
// Reads MONITORING_PROM_URL (set in docker-compose.yml to
// http://prometheus:9090 by default). Used by the SLO snapshot job to
// evaluate each SLO's metric_query and record the result.
//
// The prom HTTP API returns:
//   { data: { resultType: "vector", result: [ { metric: {}, value: [ts, "0.999"] } ] } }
//
// This helper returns the full response so callers can pick the value
// they need without re-parsing.

const PROM_URL =
  process.env.MONITORING_PROM_URL || "http://prometheus:9090";

/**
 * Run an instant PromQL query against the configured Prometheus endpoint.
 *
 * @param {string} query  PromQL expression (instant, no `range`)
 * @param {object} [options]
 * @param {number} [options.timeoutMs]  AbortSignal timeout (default 10 000)
 * @returns {Promise<object|null>}  The parsed JSON response body, or null
 *   when the query fails (network error, timeout, or non-200 status).
 *   Callers treat null as "no data — assume healthy" per SLO convention.
 */
export async function promQuery(query, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  try {
    const url =
      PROM_URL.replace(/\/+$/, "") +
      `/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Convenience: run the query and return the first numeric value, or null.
 *
 * @param {string} query
 * @returns {Promise<number|null>}
 */
export async function promQueryValue(query) {
  const body = await promQuery(query);
  const v = body?.data?.result?.[0]?.value?.[1];
  if (v === undefined || v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
