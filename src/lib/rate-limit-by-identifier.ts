import { NextResponse } from "next/server";
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit";

export interface IdentifierLimitResult {
  limited: boolean;
  retryAfter: number;
}

/**
 * Rate-limit by a caller-supplied identifier (login, email, code, roll).
 * Runs IN ADDITION TO the per-IP `withRateLimit` — never instead of it.
 * Key is normalized (lowercased, trimmed) so `Admin@CEJ.in` and
 * `admin@cej.in` share one bucket.
 */
export async function checkIdentifierLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<IdentifierLimitResult> {
  const key = "id:" + identifier.trim().toLowerCase();
  const res = await checkRateLimit(key, config);
  return { limited: res.limited, retryAfter: res.retryAfter ?? 60 };
}

export function rateLimitResponse(retryAfter: number, message = "too many attempts"): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message } },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfter))) },
    },
  );
}
