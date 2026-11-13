import { NextRequest, NextResponse } from "next/server";
import { poolQuery } from "@/lib/postgres";

// Shared-key fallback store. When Postgres (rate_limit_buckets) is
// unreachable, a per-replica in-memory Map silently doubles (or triples)
// the effective limit across replicas — N replicas => N x the configured
// limit, which is exactly the window an abuser/bot exploits. Redis is
// already in the stack (REDIS_URL), so the fallback path below routes
// through a real INCR+EXPIRE against a shared key: the limit stays
// correct across replicas even while Postgres is down.
//
// Redis is only reached on the Postgres-failure path, so a Redis outage
// alone cannot take the limiter offline — it degrades back to the
// per-instance memory fallback (auth-sensitive keys still fail closed).

type RedisClient = Awaited<ReturnType<typeof import("redis").createClient>>;
let redisClientPromise: Promise<RedisClient> | null = null;

function getRedisSharedStore(): Promise<RedisClient> {
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const redis = await import("redis");
      const client = redis.createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: { reconnectStrategy: (retries: number) => (retries < 5 ? 500 * retries : false) },
      });
      client.on("error", () => { /* connection errors surface on command failure; keep process alive */ });
      await client.connect().catch(() => {
        redisClientPromise = null;
      });
      return client;
    })();
  }
  return redisClientPromise!;
}

interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export type { RateLimitConfig };

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
  const userId = req.headers.get("x-user-id");
  const ip = extractClientIp(req);
  const identifier = userId ? `u:${userId}` : ip;
  const path = new URL(req.url).pathname;
  return `${cfg.keyPrefix}:${path}:${identifier}`;
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

// Auth-sensitive key prefixes that MUST fail closed when the shared
// Postgres store is unreachable: with 2+ web replicas the per-instance
// in-memory fallback degrades the limit to near-useless, and an auth
// limiter that silently stops limiting is a credential-guessing hole.
// Everything else stays fail-open (availability > strictness for non-auth).
const AUTH_SENSITIVE_KEY_PREFIXES = [
  "login:",
  "pin:",
  "kiosk-session:",
  "bootstrap:",
  "password_reset_email:",
] as const;

function isAuthSensitiveKey(key: string): boolean {
  return AUTH_SENSITIVE_KEY_PREFIXES.some((p) => key.startsWith(p));
}

let authSensitiveFallbackWarned = false;

/**
 * Shared-redis rate-limit check. Used when the Postgres bucket table is
 * unreachable but a redis connection is available: a real INCR+EXPIRE on
 * a global key, so the limit is not multiplied by replica count.
 * Falls through to the per-instance memory store if redis is also down.
 */
async function checkSharedRedisLimit(key: string, cfg: Required<RateLimitConfig>): Promise<RateLimitResult | null> {
  try {
    const client = await getRedisSharedStore();
    const redisKey = `rl:${cfg.keyPrefix}:${key}`;
    const windowSec = Math.max(1, Math.ceil(cfg.windowMs / 1000));
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, windowSec);
    }
    const ttl = await client.ttl(redisKey);
    const remaining = Math.max(0, cfg.maxRequests - Number(count));
    const limited = Number(count) > cfg.maxRequests;
    const retryAfter = limited ? Math.max(1, ttl) : undefined;
    return {
      limited,
      remaining,
      resetTime: new Date(Date.now() + (ttl <= 0 ? windowSec : ttl) * 1000),
      retryAfter,
    };
  } catch {
    return null;
  }
}

function checkFallbackMemoryLimit(key: string, cfg: Required<RateLimitConfig>, failClosed = false): RateLimitResult {
  if (failClosed) {
    // Auth-sensitive key with no shared store: deny the request. Loud log so
    // the operator sees the shared-store outage instead of discovering it
    // when auth locks silently stop working.
    if (!authSensitiveFallbackWarned) {
      authSensitiveFallbackWarned = true;
      console.error(
        `[rate-limit] FAIL-CLOSED: shared rate-limit store (Postgres rate_limit_buckets) unreachable ` +
        `for auth-sensitive key '${key}' — denying request (503). This is not a per-replica fallback; ` +
        `the limiter cannot bound credential-guessing across replicas.`
      );
      // Clear the latch so a subsequent recovery + re-outage logs again.
      setTimeout(() => { authSensitiveFallbackWarned = false; }, 60_000);
    }
    return { limited: true, remaining: 0, resetTime: new Date(Date.now() + 60_000), retryAfter: 60 };
  }
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
 * concurrency across replicas. If the DB fails, degrades to shared Redis
 * (INCR+EXPIRE on a global key — limit stays correct across replicas).
 * Only when both Postgres and Redis are unreachable does it fall back to
 * local in-memory enforcement (auth-sensitive keys fail closed instead).
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
    if (isAuthSensitiveKey(key)) {
      // Auth-sensitive key (login/pin/kiosk/bootstrap/password-reset): the
      // shared store is the ONLY thing bounding credential-guessing across
      // replicas — the per-instance memory fallback cannot replace it.
      // Try redis first (still shared across replicas); fail closed only
      // if redis is also unreachable.
      const redisResult = await checkSharedRedisLimit(key, cfg);
      if (redisResult) return redisResult;
      return checkFallbackMemoryLimit(key, cfg, true);
    }
    // Non-auth key: prefer shared redis (correct limit across replicas)
    // over per-instance memory. Last resort is the memory fallback.
    const redisResult = await checkSharedRedisLimit(key, cfg);
    if (redisResult) return redisResult;
    console.warn("[rate-limit] Postgres + Redis stores unavailable, degrading to local memory store:", err);
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
    let failClosed = false;
    try {
      result = await checkRateLimit(req, cfg);
    } catch (err) {
      // Store failure that checkRateLimit could not absorb. For
      // auth-sensitive keys this is an exception (they are handled by the
      // catch inside checkRateLimit and never reach here); fail closed
      // here as well for the belt-and-braces case.
      if (isAuthSensitiveKey(bucketKey(req, cfg))) {
        failClosed = true;
        result = checkFallbackMemoryLimit(bucketKey(req, cfg), cfg, true);
      } else {
        // If the DB is unreachable, fail-open but log loudly. A limiter that
        // 500s is worse than no limiter — it takes the whole auth flow down.
        console.error("[rate-limit] store failure, failing open", err);
        return handler(req, ...args);
      }
    }
    if (result.limited) {
      const status = failClosed ? 503 : 429;
      const code = failClosed ? "RATE_LIMIT_STORE_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED";
      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message: failClosed
              ? "Rate-limit store unavailable; auth request denied (fail-closed)"
              : "Too many requests",
          },
        },
        {
          status,
          headers: {
            "retry-after": String(result.retryAfter ?? 60),
            "x-ratelimit-limit": String(cfg.maxRequests),
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": result.resetTime.toISOString(),
            // Batch I4: the metrics middleware reads this to set
            // api_metrics.rate_limit_hit for forensic 429 drill-down.
            "x-ratelimit-hit": "1",
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
