import { NextRequest, NextResponse } from "next/server";
import { poolQuery } from "@/lib/postgres";

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * Trusted source-of-truth for client IP.
 * Caddy sets X-Client-IP from {remote_host} (see Caddyfile).
 * Cloudflare sets CF-Connecting-IP; prefer X-Client-IP because Caddy already
 * rewrote it from the real TCP peer.
 *
 * P1-14: X-Real-IP is client-spoofable (a caller can set it directly, e.g.
 * via a curl header), so it is ONLY consulted when TRUSTED_PROXY_IPS is set
 * to a non-empty list (i.e. we are behind a known proxy that is expected to
 * set it, and the socket peer address check is enforced upstream). When
 * TRUSTED_PROXY_IPS is empty/unset we skip x-real-ip entirely and rely on
 * the rightmost x-forwarded-for hop (the last trusted proxy's view of the
 * client) or "unknown".
 *
 * Unit note: extractClientIp("...x-real-ip: 10.0.0.1, x-forwarded-for: a,b")
 *   - with TRUSTED_PROXY_IPS set      -> "10.0.0.1" (trusted proxy value)
 *   - with TRUSTED_PROXY_IPS unset    -> "b"        (x-forwarded-for last hop;
 *     x-real-ip is ignored as untrusted)
 */
export function extractClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const rightmostHop = xff ? xff.split(",").pop()?.trim() : undefined;

  // Only trust x-real-ip when a trusted-proxy allowlist is configured
  // (P1-14). Without it the header is spoofable and must be ignored.
  const trustedProxyIps = (process.env.TRUSTED_PROXY_IPS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const realIp = trustedProxyIps.length > 0 ? req.headers.get("x-real-ip") : undefined;

  return (
    req.headers.get("x-client-ip") ??
    req.headers.get("cf-connecting-ip") ??
    realIp ??
    rightmostHop ??
    "unknown"
  );
}

function resolveConfig(config: RateLimitConfig): Required<RateLimitConfig> {
  return {
    windowMs: config.windowMs ?? 60_000,
    maxRequests: config.maxRequests ?? 60,
    keyPrefix: config.keyPrefix ?? "rl",
  };
}

function bucketKey(req: NextRequest, cfg: Required<RateLimitConfig>): string {
  const ip = extractClientIp(req);
  const path = new URL(req.url).pathname;
  return `${cfg.keyPrefix}:${path}:${ip}`;
}

/**
 * Atomic increment-and-read. Single SQL statement means it's safe under
 * concurrency across replicas. Accepts either a NextRequest (keyed by
 * keyPrefix:pathname:clientIp) or an explicit bucket key string (used by
 * per-identifier / per-user lockouts in auth, mobile, and kiosk routes).
 */
// In-memory fallback bucket store if database is unreachable (degrades gracefully per-instance, never fails open blindly)
interface MemoryBucket {
  count: number;
  resetAt: number;
}
const fallbackMemoryStore = new Map<string, MemoryBucket>();

function checkFallbackMemoryLimit(key: string, cfg: Required<RateLimitConfig>): RateLimitResult {
  const now = Date.now();
  let bucket = fallbackMemoryStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + cfg.windowMs };
    fallbackMemoryStore.set(key, bucket);
  } else {
    bucket.count += 1;
  }
  const remaining = Math.max(0, cfg.maxRequests - bucket.count);
  const limited = bucket.count > cfg.maxRequests;
  const retryAfter = limited ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : undefined;
  return { limited, remaining, resetTime: new Date(bucket.resetAt), retryAfter };
}

/**
 * Enforce a rate limit using PostgreSQL `rate_limit_buckets` table for shared
 * concurrency across replicas. If the DB fails, degrades to local in-memory
 * enforcement rather than failing open.
 */
export async function checkRateLimit(
  reqOrKey: NextRequest | string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const cfg = resolveConfig(config);
  const key =
    typeof reqOrKey === "string" ? reqOrKey : bucketKey(reqOrKey, cfg);
  try {
    const { rows } = await poolQuery<{ count: number; reset_at: Date }>(
      `
      INSERT INTO public.rate_limit_buckets (key, count, reset_at)
      VALUES ($1, 1, NOW() + make_interval(secs => $2::float / 1000))
      ON CONFLICT (key) DO UPDATE
        SET count = CASE
              WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
              ELSE rate_limit_buckets.count + 1
            END,
            reset_at = CASE
              WHEN rate_limit_buckets.reset_at <= NOW()
                THEN NOW() + make_interval(secs => $2::float / 1000)
              ELSE rate_limit_buckets.reset_at
            END
      RETURNING count, reset_at;
      `,
      [key, cfg.windowMs]
    );
    const row = rows[0];
    const remaining = Math.max(0, cfg.maxRequests - row.count);
    const limited = row.count > cfg.maxRequests;
    const retryAfter = limited
      ? Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000))
      : undefined;
    return { limited, remaining, resetTime: new Date(row.reset_at), retryAfter };
  } catch (err) {
    console.warn("[rate-limit] DB store unavailable, degrading to local memory store:", err);
    return checkFallbackMemoryLimit(key, cfg);
  }
}

function attachHeaders(res: Response, cfg: Required<RateLimitConfig>, r: RateLimitResult) {
  const out = new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
  out.headers.set("x-ratelimit-limit", String(cfg.maxRequests));
  out.headers.set("x-ratelimit-remaining", String(r.remaining));
  out.headers.set("x-ratelimit-reset", r.resetTime.toISOString());
  return out;
}

/**
 * Wraps a route handler. Enforces the limit AND reflects real state on the
 * success path — this is what the old version was missing (it set headers
 * from config, never from the store).
 */
export function withRateLimit<TArgs extends unknown[] = unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  const cfg = resolveConfig(config);
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    let result: RateLimitResult;
    try {
      result = await checkRateLimit(req, cfg);
    } catch (err) {
      // If the DB is unreachable, fail-open but log loudly. A limiter that
      // 500s is worse than no limiter — it takes the whole auth flow down.
      console.error("[rate-limit] store failure, failing open", err);
      return handler(req, ...args);
    }
    if (result.limited) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
        },
        {
          status: 429,
          headers: {
            "retry-after": String(result.retryAfter ?? 60),
            "x-ratelimit-limit": String(cfg.maxRequests),
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": result.resetTime.toISOString(),
          },
        }
      );
    }
    return attachHeaders(await handler(req, ...args), cfg, result);
  };
}

/**
 * Enforce a limit for an explicit bucket key. Some routes lock out per
 * identifier (login attempts, bootstrap, mobile login, kiosk sessions)
 * rather than per client IP, so they pass a key like
 * `bootstrap:9150010505`. This delegates to the same Postgres-backed store.
 */
export async function rateLimitByKey(
  key: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  return checkRateLimit(key, config);
}

/** Kept for compatibility with `src/proxy.ts`. */
export async function rateLimit(req: NextRequest, config?: RateLimitConfig) {
  return checkRateLimit(req, config);
}

export default rateLimit;
