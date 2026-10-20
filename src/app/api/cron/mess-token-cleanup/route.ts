// src/app/api/cron/mess-token-cleanup/route.ts
// POST — soft-revoke unused, expired mess tokens (meal + event) so they don't
// accumulate forever (M7). Idempotent: re-running only touches still-open rows.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query } from "@/lib/postgres";

function checkAuth(req: NextRequest): boolean {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { rowCount: mealExpired } = await query(
    `UPDATE public.mess_tokens
        SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE used_at IS NULL
        AND revoked_at IS NULL
        AND expires_at < NOW() - INTERVAL '2 hours'`,
  );

  const { rowCount: eventExpired } = await query(
    `UPDATE public.mess_event_tokens
        SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE used_at IS NULL
        AND revoked_at IS NULL
        AND expires_at < NOW() - INTERVAL '2 hours'`,
  );

  return NextResponse.json({
    mealExpired: mealExpired ?? 0,
    eventExpired: eventExpired ?? 0,
  });
}
