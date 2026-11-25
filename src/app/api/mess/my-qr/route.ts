import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { buildQr, currentTotp, issueDailySecret } from "@/lib/mess/totp";

/**
 * GET /api/mess/my-qr?session_id=
 * Returns the student's rotating 30s TOTP QR for the active (or requested) meal session.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sessionIdParam = req.nextUrl.searchParams.get("session_id");

  const { rows: sessionRows } = await query<{
    id: string;
    meal_date: string;
    meal_type: string;
    window_opens_at: string;
    window_closes_at: string;
  }>(
    sessionIdParam
      ? `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at
           FROM public.mess_days WHERE id = $1::uuid LIMIT 1`
      : `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at
           FROM public.mess_days
          WHERE is_active = true AND NOW() BETWEEN window_opens_at AND window_closes_at
          ORDER BY window_opens_at DESC LIMIT 1`,
    sessionIdParam ? [sessionIdParam] : [],
  );

  const session = sessionRows[0];
  if (!session) {
    return fail("NO_ACTIVE_SESSION", "No active meal session right now", 404);
  }

  const secretHex = await issueDailySecret(auth.userId, session.meal_date);
  const { rows: stateRows } = await query<{ last_counter: number }>(
    `SELECT last_counter FROM public.mess_totp_state
      WHERE student_id = $1::uuid AND session_id = $2::uuid LIMIT 1`,
    [auth.userId, session.id],
  );
  const nextCounter = (stateRows[0]?.last_counter ?? 0) + 1;
  const opensMs = new Date(session.window_opens_at).getTime();
  const nowMs = Date.now();
  const totp = currentTotp(secretHex, opensMs, nowMs, 0);
  const qr = buildQr(auth.userId, session.id, nextCounter, totp);
  const elapsedInStep = Math.floor(((nowMs - opensMs) % 30_000) / 1000);
  const expiresInS = Math.max(1, 30 - elapsedInStep);

  return ok({
    qr,
    counter: nextCounter,
    expires_in_s: expiresInS,
    already_scanned: (stateRows[0]?.last_counter ?? 0) > 0,
    session: {
      id: session.id,
      meal_date: session.meal_date,
      meal_type: session.meal_type,
      window_opens_at: session.window_opens_at,
      window_closes_at: session.window_closes_at,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "admin", "sysadmin"],
});
