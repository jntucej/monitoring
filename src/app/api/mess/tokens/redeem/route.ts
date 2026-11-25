// src/app/api/mess/tokens/redeem/route.ts
// POST — anti-tamper mess-token redemption.
//
//   1. verifyToken(qr)      — HMAC + nonce; a tampered tuple is rejected 400.
//   2. session window       — the mess day must be open (not yet / closed /
//                             tokens_locked → 409).
//   3. redeemToken(qr,…)    — atomic `UPDATE … WHERE used_at IS NULL`;
//                             exactly one concurrent call wins, the rest 409.
//
// The scanner's device id is taken from the auth context's gateId when the
// scanner is a registered kiosk; an unknown device is logged (not rejected)
// so the anomaly worker can flag it.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { verifyToken, redeemToken } from "@/lib/mess/token";
import type { AuthContext } from "@/lib/authContext";

const SCANNERS = new Set(["mess_incharge", "operator", "admin", "sysadmin"]);

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  if (!SCANNERS.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);

  const body = (await req.json().catch(() => ({}))) as { qr?: string; token_code?: string };
  const qr = body.qr ?? body.token_code;
  if (typeof qr !== "string" || !qr) return fail("VALIDATION_ERROR", "qr required", 400);

  const v = verifyToken(qr);
  if (!v.ok) {
    await addAudit({ action: "MESS_TOKEN_HMAC_FAIL", userId: auth.userId, role: auth.role, details: { reason: v.reason } });
    return fail("HMAC_FAIL", v.reason, 400);
  }

  const { rows } = await query<{ opens_at: string; closes_at: string; tokens_locked: boolean; status_state: string }>(
    `SELECT opens_at, closes_at, tokens_locked, status_state FROM public.mess_days WHERE id = $1`,
    [v.messDayId]
  );
  if (rows.length === 0) return fail("NOT_FOUND", "mess day not found", 404);
  const day = rows[0];
  const now = Date.now();
  if (new Date(day.opens_at).getTime() > now) return fail("TOO_EARLY", "session not open yet", 409);
  if (new Date(day.closes_at).getTime() < now || day.tokens_locked) {
    return fail("SESSION_CLOSED", "session closed or tokens locked", 409);
  }

  const result = await redeemToken(qr, auth.gateId ?? null, auth.userId);
  if (result.result === "ok") {
    await query(
      `INSERT INTO public.mess_meal_served (user_id, mess_day_id, served_at, method, served_by)
       VALUES ($1, $2, now(), 'scan', $3)`,
      [result.studentId!, result.messDayId!, auth.userId]
    );
    await addAudit({
      action: "MESS_TOKEN_REDEEMED",
      userId: auth.userId,
      role: auth.role,
      details: { studentId: result.studentId, messDayId: result.messDayId },
    });
    return ok({ studentId: result.studentId, messDayId: result.messDayId, result: "ok" });
  }

  const status: Record<string, number> = {
    duplicate: 409, expired: 409, revoked: 409, not_issued: 404,
    wrong_session: 409, wrong_device: 409, hmac_fail: 400, malformed: 400,
  };
  await addAudit({
    action: `MESS_TOKEN_${result.result.toUpperCase()}`,
    userId: auth.userId,
    role: auth.role,
    details: { studentId: result.studentId, messDayId: result.messDayId },
  });
  return fail(result.result.toUpperCase(), result.result, status[result.result] ?? 409);
}

export const POST = withAuthorization(handlePost);
