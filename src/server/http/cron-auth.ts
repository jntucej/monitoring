import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { fail } from "@/server/http/response";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

/**
 * P4: constant-time cron secret check shared by every route under
 * /api/cron/*. Returns a Response to send (401/503) or null when authorized.
 *
 * The length pre-check short-circuits mismatched-length inputs — the
 * canonical secret is fixed-length, so leaking the comparison length is
 * not a new information channel, and it prevents timingSafeEqual from
 * throwing on unequal buffers.
 */
export function requireCronAuth(req: NextRequest): Response | null {
  if (!CRON_SECRET) {
    return fail("INTERNAL_ERROR", "CRON_SECRET is not configured", 500);
  }
  const header = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (header.length !== CRON_SECRET.length) {
    return fail("UNAUTHORIZED", "Invalid cron secret", 401);
  }
  const ok = timingSafeEqual(Buffer.from(header), Buffer.from(CRON_SECRET));
  if (!ok) return fail("UNAUTHORIZED", "Invalid cron secret", 401);
  return null;
}
