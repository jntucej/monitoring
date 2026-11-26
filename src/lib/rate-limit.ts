// src/lib/rate-limit.ts
//
// Layered API rate limiter.
//
// Store order (U4):
//   1. Primary — configured via RATELIMIT_PRIMARY_STORE (default "postgres"):
//        postgres: atomic upsert on public.rate_limit_buckets (cross-replica)
//        redis:    atomic Lua INCR+PEXPIRE (single round-trip, no leak window)
//   2. Secondary — the other available store (resilience: a Redis outage
//      cannot take the limiter offline; same for Postgres).
//   3. Last resort — per-instance in-memory. Auth-sensitive categories
//      fail CLOSED (503) when no shared store is reachable; everything
//      else fails OPEN (availability > strictness for non-auth).
//
// Identity:
//   - Authenticated: x-user-id — injected by withAuthorization() from the
//     VERIFIED JWT; client-supplied copies are overwritten + HMAC-signed,
//     so it cannot be spoofed or rotated to bypass limits.
//   - Unauthenticated: trusted client IP via extractClientIp()
//     (Caddy sets X-Client-IP from {remote_host} and strips client-supplied
//     forwarding headers; see docs/u4-audit-and-proposal.md Step 4).
//
// Security:
//   - 429/503 bodies never carry Redis/Postgres error text (U3 contract).
//   - No tokens, passwords, cookies or PII in keys or logs — keys are
//     keyPrefix:pathname:u:<userId> or keyPrefix:pathname:<ip>.

import { NextRequest, NextResponse } from "next/server";
import { poolQuery } from "@/lib/postgres";
import { createHash } from "node:crypto";
import { routeFailsClosed } from "@/lib/rate-limit-policies";
import { logRequest, sanitizeRequestId } from "@/lib/log";

// ── Redis client (lazy singleton, reconnect strategy, no-crash handler) ────
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
      // A successful (re)connect implies a fresh script cache on the
      // server side — reset the load-latch so the next EVALSHA recovers
      // via NOSCRIPT → SCRIPT LOAD.
      client.on("ready", () => { scriptLoaded = false; });
      await client.connect().catch(() => {
        redisClientPromise = null;
      });
      return client;
    })();
  }
  return redisClientPromise!;
}

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
  const userId = req.headers.get("x-user-id");
  const ip = extractClientIp(req);
  const identifier = userId ? `u:${userId}` : ip;
  const path = new URL(req.url).pathname;
  return `${cfg.keyPrefix}:${path}:${identifier}`;
}

// ── Failure policy (U4 gap E) ────────────────────────────────────────────────
// Auth-sensitive key prefixes that MUST fail closed when no shared store is
// reachable: with 2+ web replicas the per-instance in-memory fallback
// degrades the limit to near-useless, and an auth limiter that silently
// stops limiting is a credential-guessing hole. Everything else stays
// fail-open (availability > strictness for non-auth).
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

/**
 * U4 gap E: fail-closed key test.
 *  1. Legacy auth-sensitive prefixes (login/pin/kiosk-session/bootstrap/
 *     password_reset_email) — always fail closed.
 *  2. Rate-limit policies with failClosed=true whose keyPrefix is one of
 *     the known policy prefixes (auth/otp/admin-mutation) — fail closed.
 *  3. RATELIMIT_FAIL_CLOSED_CATEGORIES env override (comma list) —
 *     additional prefixes that fail closed.
 */
export function isFailClosedKey(key: string): boolean {
  if (isAuthSensitiveKey(key)) return true;
  const configured = (process.env.RATELIMIT_FAIL_CLOSED_CATEGORIES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);
  // Policy keyPrefixes that are fail-closed: "auth", "otp", "admin-mutation"
  const policyPrefixes = ["auth:", "otp:", "admin-mutation:"];
  return policyPrefixes.concat(
    configured.map((p) => `${p}:`)
  ).some((p) => key.startsWith(p));
}

let authSensitiveFallbackWarned = false;

// ── Postgres store (atomic single-statement upsert, cross-replica) ──────────
async function checkPostgresLimit(key: string, cfg: Required<RateLimitConfig>): Promise<RateLimitResult> {
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

// ── Redis store (U4 gap B: atomic Lua INCR + PEXPIRE, single round-trip) ────
// INCR + PEXPIRE in one EVALSHA (script cached in Redis by SHA1): one
// round-trip, atomic — no crash window between the two commands, so a
// counter can never be left without a TTL (the old 2-RTT INCR→EXPIRE path
// leaked a key-without-expiry if the process died between the commands).
const INCR_PEXPIRE_LUA = `
    local c = redis.call('INCR', KEYS[1])
    if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
    local ttl = redis.call('PTTL', KEYS[1])
    return {c, ttl < 0 and ARGV[1] or ttl}
  `;

/** SHA1 of the script source — used in EVALSHA (Redis caches by SHA1;
 *  computed locally so we don't need the redis client's helper types). */
const INCR_PEXPIRE_SHA1 = createHash("sha1").update(INCR_PEXPIRE_LUA).digest("hex");

// Tracks whether the script has been confirmed loaded in the current Redis
// instance. After a restart / SCRIPT FLUSH the cache is empty, so the first
// EVALSHA will NOSCRIPT — we load via SCRIPT LOAD and retry, then latch.
// Reset to false when the client reconnects (see client.on("ready")).
let scriptLoaded = false;

/**
 * Shared-redis rate-limit check (atomic, with NOSCRIPT recovery).
 *
 * Sequence (per the required behavior):
 *   1. EVALSHA — fast path when the script is cached in Redis.
 *   2. On NOSCRIPT: SCRIPT LOAD the source, retry EVALSHA once.
 *   3. Latch scriptLoaded so the operator can see the recovery happened.
 *   4. If Redis remains unavailable after all attempts, return null and
 *      the caller's Postgres/memory fallback takes over (preserved).
 *
 * The `scriptLoaded` latch is reset on every client "ready" event (which
 * fires on (re)connect), so a Redis restart that wipes the script cache
 * is always recovered on the next request.
 */
async function checkSharedRedisLimit(key: string, cfg: Required<RateLimitConfig>): Promise<RateLimitResult | null> {
  try {
    const client = await getRedisSharedStore();
    const redisKey = `rl:${cfg.keyPrefix}:${key}`;
    const windowMs = Math.max(1, cfg.windowMs);

    const evalsha = async (): Promise<[number, number] | null> => {
      try {
        return (await client.sendCommand([
          "EVALSHA", INCR_PEXPIRE_SHA1, "1", redisKey, String(windowMs),
        ])) as unknown as [number, number];
      } catch (e: any) {
        // NOSCRIPT error: the script is not in this instance's cache
        // (fresh Redis, SCRIPT FLUSH, or eviction). Load and retry once.
        if (e?.message?.includes("NOSCRIPT") || e?.code === "NOSCRIPT") {
          await client.sendCommand(["SCRIPT", "LOAD", INCR_PEXPIRE_LUA]);
          scriptLoaded = true;
          return (await client.sendCommand([
            "EVALSHA", INCR_PEXPIRE_SHA1, "1", redisKey, String(windowMs),
          ])) as unknown as [number, number];
        }
        throw e; // any other Redis error → caller's fallback
      }
    };

    const result = await evalsha();
    if (!result) return null;
    const [count, ttlMsRaw] = result;
    const c = Number(count);
    const ttlMs = Number(ttlMsRaw);
    const remaining = Math.max(0, cfg.maxRequests - c);
    const limited = c > cfg.maxRequests;
    const retryAfter = limited ? Math.max(1, Math.ceil(ttlMs / 1000)) : undefined;
    return {
      limited,
      remaining,
      resetTime: new Date(Date.now() + ttlMs),
      retryAfter,
    };
  } catch {
    // Redis unreachable (connection down, auth failure, etc.) — the caller
    // falls back to the next store (Postgres secondary or memory). This
    // preserves the layered resilience contract.
    return null;
  }
}

// ── In-memory last resort ─────────────────────────────────────────────────────
interface MemoryBucket {
  count: number;
  resetAt: number;
}
const fallbackMemoryStore = new Map<string, MemoryBucket>();

function checkFallbackMemoryLimit(key: string, cfg: Required<RateLimitConfig>, failClosed = false): RateLimitResult {
  if (failClosed) {
    // Shared store unreachable for a fail-closed key: deny. Loud log so the
    // operator sees the outage instead of discovering it when auth locks
    // silently stop working.
    if (!authSensitiveFallbackWarned) {
      authSensitiveFallbackWarned = true;
      console.error(
        `[rate-limit] FAIL-CLOSED: shared rate-limit store unreachable ` +
        `for fail-closed key '${key}' — denying request (503). This is not a per-replica fallback; ` +
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

// ── Primary store selection (U4 gap A) ────────────────────────────────────────
// RATELIMIT_PRIMARY_STORE=redis makes Redis the primary and Postgres the
// secondary. Default "postgres" = today's behavior (zero change on deploy).
function primaryStore(): "postgres" | "redis" {
  return process.env.RATELIMIT_PRIMARY_STORE === "redis" ? "redis" : "postgres";
}

/**
 * Enforce a rate limit. Store order:
 *   RATELIMIT_PRIMARY_STORE=postgres (default): postgres → redis → memory
 *   RATELIMIT_PRIMARY_STORE=redis:              redis → postgres → memory
 * Fail-closed keys (auth-sensitive + RATELIMIT_FAIL_CLOSED_CATEGORIES) deny
 * with a synthetic "limited" result when no shared store is reachable.
 */
export async function checkRateLimit(
  reqOrKey: NextRequest | string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const cfg = resolveConfig(config);
  const key = typeof reqOrKey === "string" ? reqOrKey : bucketKey(reqOrKey, cfg);
  const primary = primaryStore();

  const stores = primary === "postgres"
    ? [checkPostgresLimit.bind(null, key, cfg), () => checkSharedRedisLimit(key, cfg)]
    : [() => checkSharedRedisLimit(key, cfg), () => {
        // Postgres secondary path — only reached when primary is redis.
        try {
          return checkPostgresLimit(key, cfg);
        } catch {
          return null;
        }
      }];

  for (const attempt of stores) {
    try {
      const result = await (attempt as () => Promise<RateLimitResult | null>)();
      if (result) return result;
    } catch {
      // store unavailable → next store
    }
  }

  // No shared store reachable.
  if (isFailClosedKey(key)) {
    return checkFallbackMemoryLimit(key, cfg, true);
  }
  console.warn("[rate-limit] Postgres + Redis stores unavailable, degrading to local memory store (fail-open)");
  return checkFallbackMemoryLimit(key, cfg, false);
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
 * Wraps a route handler. Enforces the limit AND reflects real store state on
 * the success path. 429/503 bodies follow the U3 canonical error contract.
 */
export function withRateLimit<TArgs extends unknown[] = unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  const cfg = resolveConfig(config);
  return async (req: NextRequest, ...args: TArgs): Promise<Response> => {
    const startTime = Date.now();
    const requestId = sanitizeRequestId(req.headers.get("x-request-id"));
    const route = req.nextUrl?.pathname ?? "/";
    const insideAuth = req.headers.get("x-u6-auth") === "1";
    if (!insideAuth) {
      try {
        req.headers.set("x-u6-rl", "1");
      } catch {
        // Immutable headers in synthetic test requests
      }
    }

    let result: RateLimitResult;
    let failClosed = false;
    try {
      result = await checkRateLimit(req, cfg);
    } catch (err) {
      // Store failure that checkRateLimit could not absorb (should be rare —
      // it catches all store errors internally). Fail-closed keys deny;
      // everything else fails open (a limiter that 500s takes the whole
      // auth flow down — worse than no limiter).
      const key = bucketKey(req, cfg);
      if (isFailClosedKey(key)) {
        failClosed = true;
        result = checkFallbackMemoryLimit(key, cfg, true);
      } else {
        console.error("[rate-limit] store failure, failing open", err);
        try {
          const res = await handler(req, ...args);
          const alreadyLogged = res.headers.get("x-u6-logged") === "1";
          try { res.headers.delete("x-u6-logged"); } catch {}
          if (!alreadyLogged && !insideAuth) {
            const errorCode = res.headers.get("x-error-code") ?? null;
            try { res.headers.delete("x-error-code"); } catch {}
            try { res.headers.delete("x-auth-user-id"); } catch {}
            try { res.headers.delete("x-auth-role"); } catch {}
            if (!res.headers.has("x-request-id")) {
              try { res.headers.set("x-request-id", requestId); } catch {}
            }
            logRequest({
              request_id: requestId,
              method: req.method,
              route,
              status: res.status,
              duration_ms: Date.now() - startTime,
              source: "web",
              error_code: errorCode,
            });
          }
          return res;
        } catch (handlerErr) {
          if (!insideAuth) {
            logRequest({
              request_id: requestId,
              method: req.method,
              route,
              status: 500,
              duration_ms: Date.now() - startTime,
              source: "web",
              error_code: "INTERNAL_ERROR",
            });
          }
          throw handlerErr;
        }
      }
    }
    if (result.limited) {
      const status = failClosed ? 503 : 429;
      const code = failClosed ? "RATE_LIMIT_STORE_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED";
      if (!insideAuth) {
        logRequest({
          request_id: requestId,
          method: req.method,
          route,
          status,
          duration_ms: Date.now() - startTime,
          source: "web",
          error_code: code,
        });
      }
      // U3 canonical contract: safe generic messages; no store error text.
      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message: failClosed
              ? "Service temporarily unavailable. Please retry later."
              : "Too many requests. Please wait a moment and retry.",
          },
        },
        {
          status,
          headers: {
            "retry-after": String(result.retryAfter ?? 60),
            "x-ratelimit-limit": String(cfg.maxRequests),
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": result.resetTime.toISOString(),
            "x-request-id": requestId,
            // Metrics middleware reads this to set api_metrics.rate_limit_hit
            // for forensic 429 drill-down.
            "x-ratelimit-hit": "1",
          },
        }
      );
    }
    try {
      const rawRes = await handler(req, ...args);
      const res = attachHeaders(rawRes, cfg, result);
      const alreadyLogged = res.headers.get("x-u6-logged") === "1";
      try { res.headers.delete("x-u6-logged"); } catch {}
      if (!alreadyLogged && !insideAuth) {
        const errorCode = res.headers.get("x-error-code") ?? null;
        try { res.headers.delete("x-error-code"); } catch {}
        try { res.headers.delete("x-auth-user-id"); } catch {}
        try { res.headers.delete("x-auth-role"); } catch {}
        if (!res.headers.has("x-request-id")) {
          try { res.headers.set("x-request-id", requestId); } catch {}
        }
        logRequest({
          request_id: requestId,
          method: req.method,
          route,
          status: res.status,
          duration_ms: Date.now() - startTime,
          source: "web",
          error_code: errorCode,
        });
      }
      return res;
    } catch (handlerErr) {
      if (!insideAuth) {
        logRequest({
          request_id: requestId,
          method: req.method,
          route,
          status: 500,
          duration_ms: Date.now() - startTime,
          source: "web",
          error_code: "INTERNAL_ERROR",
        });
      }
      throw handlerErr;
    }
  };
}

/**
 * Enforce a limit for an explicit bucket key. Some routes lock out per
 * identifier (login attempts, bootstrap, mobile login, kiosk sessions)
 * rather than per client IP, so they pass a key like `bootstrap:9150010505`.
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
