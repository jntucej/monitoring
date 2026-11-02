// src/app/api/cron/mess-token-cleanup/route.ts
// POST — soft-revoke unused, expired mess tokens (meal + event) so they don't
// accumulate forever (M7). Idempotent: re-running only touches still-open rows.

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";


export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

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
