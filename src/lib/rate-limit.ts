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
 */
export function extractClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const rightmostHop = xff ? xff.split(",").pop()?.trim() : undefined;
  return (
    req.headers.get("x-client-ip") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
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
export async function checkRateLimit(
  reqOrKey: NextRequest | string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const cfg = resolveConfig(config);
  const key =
    typeof reqOrKey === "string" ? reqOrKey : bucketKey(reqOrKey, cfg);
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
