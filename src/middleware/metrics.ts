import { NextRequest } from 'next/server';
import { query } from '@/lib/postgres';
import { logRequest, sanitizeRequestId, isHealthOrMetricsPath, shouldLogHealthChecks } from '@/lib/log';

function safeDeleteHeader(res: Response, name: string) {
  try {
    res.headers.delete(name);
  } catch {
    // Immutable headers (e.g. synthetic Response in tests)
  }
}

function safeSetHeader(res: Response, name: string, value: string) {
  try {
    res.headers.set(name, value);
  } catch {
    // Immutable headers
  }
}

// Middleware to collect API performance metrics
export async function metricsMiddleware(req: NextRequest, handler: () => Promise<Response>) {
  const startTime = Date.now();
  const path = req.nextUrl.pathname;

  // Batch I4 + U6: validate inbound X-Request-Id or mint a safe UUID.
  const requestId = sanitizeRequestId(req.headers.get("x-request-id"));

  // Skip metrics & request logs for health/metrics endpoints unless LOG_HEALTH_CHECKS=1
  if (isHealthOrMetricsPath(path)) {
    const res = await handler();
    if (shouldLogHealthChecks()) {
      logRequest({
        request_id: requestId,
        method: req.method,
        route: path,
        status: res.status,
        duration_ms: Date.now() - startTime,
        source: "web",
      });
    }
    return res;
  }

  try {
    const response = await handler();
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // Pull internal identity/error metadata, then strip before returning to client.
    const userId = response.headers.get("x-auth-user-id") ?? null;
    const role = response.headers.get("x-auth-role") ?? null;
    const errorCode = response.headers.get("x-error-code") ?? null;
    safeDeleteHeader(response, "x-auth-user-id");
    safeDeleteHeader(response, "x-auth-role");
    safeDeleteHeader(response, "x-error-code");

    // Batch I4: csrf_result + rate_limit_hit are written by the CSRF /
    // rate-limit guards as response headers; default to "exempt" / false
    // when the guard didn't run for this route.
    const csrfResult = response.headers.get("x-csrf-result") ?? "exempt";
    const rateLimitHit = response.headers.get("x-ratelimit-hit") === "1";
    const route = response.headers.get("x-route-pattern") ?? path;

    // Echo the request-id back to the caller so they can reference it in
    // logs / support tickets.
    safeSetHeader(response, "x-request-id", requestId);

    // U6: emit canonical http.request JSON log once per request.
    const alreadyLogged = response.headers.get("x-u6-logged") === "1";
    if (!alreadyLogged) {
      logRequest({
        request_id: requestId,
        method: req.method,
        route,
        status: statusCode,
        duration_ms: duration,
        source: "web",
        user_id: userId,
        role,
        error_code: errorCode,
      });
    }
    if (req.headers.get("x-u6-rl") === "1") {
      safeSetHeader(response, "x-u6-logged", "1");
    } else {
      safeDeleteHeader(response, "x-u6-logged");
    }

    // Log metrics asynchronously (don't block response)
    logMetrics({
      path,
      route,
      method: req.method,
      statusCode,
      duration,
      requestId,
      userId,
      role,
      csrfResult,
      rateLimitHit,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logRequest({
      request_id: requestId,
      method: req.method,
      route: path,
      status: 500,
      duration_ms: duration,
      source: "web",
      error_code: "INTERNAL_ERROR",
    });
    logMetrics({
      path,
      route: path,
      method: req.method,
      statusCode: 500,
      duration,
      requestId,
      csrfResult: "exempt",
      rateLimitHit: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

// Log metrics to database (Batch I4: forensic columns)
async function logMetrics(data: {
  path: string;
  route: string;
  method: string;
  statusCode: number;
  duration: number;
  requestId?: string;
  userId?: string | null;
  role?: string | null;
  csrfResult?: string;
  rateLimitHit?: boolean;
  error?: string;
  timestamp: string;
}) {
  try {
    await query(
      `INSERT INTO public.api_metrics
         (path, route, method, status_code, response_time, error, timestamp,
          request_id, user_id, role, csrf_result, rate_limit_hit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        data.path.slice(0, 255),
        data.route.slice(0, 255),
        data.method,
        data.statusCode,
        Math.round(data.duration),
        data.error ?? null,
        data.timestamp,
        data.requestId ?? null,
        data.userId ?? null,
        data.role ?? null,
        data.csrfResult ?? null,
        data.rateLimitHit ?? false,
      ],
    );
  } catch {
    // Metrics write failure must never take down the request.
  }
}

