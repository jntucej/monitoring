import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { fail } from "@/server/http/response";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export function requireCronAuth(req: NextRequest): Response | null {
  if (!CRON_SECRET) {
    return fail("INTERNAL_ERROR", "CRON_SECRET is not configured", 500);
  }
  const header = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(CRON_SECRET);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return fail("UNAUTHORIZED", "Invalid cron secret", 401);
  return null;
}
