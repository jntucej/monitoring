import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/postgres';

// Middleware to collect API performance metrics
export async function metricsMiddleware(req: NextRequest, handler: () => Promise<Response>) {
  const startTime = Date.now();
  const path = req.nextUrl.pathname;

  // Batch I4: request-id — accept a caller-supplied X-Request-Id so
  // retries / external trace IDs land on the same forensic row,
  // otherwise generate one.
  const requestId = req.headers.get("x-request-id") ?? randomUUID();

  // Skip metrics for health check endpoints to avoid feedback loop
  if (path.includes('/api/health') || path.includes('/api/metrics')) {
    return handler();
  }

  try {
    const response = await handler();
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // Pull the identity set by withAuthorization (absent on public
    // routes — headers are only written after a successful auth check).
    const userId = response.headers.get("x-auth-user-id") ?? null;
    const role = response.headers.get("x-auth-role") ?? null;
    // Batch I4: csrf_result + rate_limit_hit are written by the CSRF /
    // rate-limit guards as response headers; default to "exempt" / false
    // when the guard didn't run for this route.
    const csrfResult = response.headers.get("x-csrf-result") ?? "exempt";
    const rateLimitHit = response.headers.get("x-ratelimit-hit") === "1";
    const route = response.headers.get("x-route-pattern") ?? path;

    // Echo the request-id back to the caller so they can reference it in
    // logs / support tickets.
    response.headers.set("x-request-id", requestId);

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

