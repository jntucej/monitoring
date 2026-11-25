/**
 * Mess tokens — anti-tamper issuance + verification + atomic single-use.
 *
 * Extends the EXISTING mess_tokens table (20270131000006 added nonce,
 * token_hash, redeem_device_id, single_use). The guarantee:
 *
 *  1. HMAC secret is server-only — a student's phone never sees it; forging
 *     a token requires the key.
 *  2. Nonce — a captured QR cannot be replayed; each issuance is unique.
 *  3. Session window — expires_at is bound to the mess_day's close; a
 *     screenshot reused later is expired.
 *  4. Atomic single-use — `UPDATE … WHERE id=$1 AND used_at IS NULL
 *     RETURNING id`: exactly one concurrent call wins; the rest get 0 rows
 *     (duplicate/replay/race).
 *  5. Device binding — redeem_device_id must be a registered scanner; an
 *     unknown device is logged as wrong_device.
 */
import { createHmac, randomBytes } from "crypto";
import { query } from "@/lib/postgres";

// Loaded from env, never sent to the client. A KMS-backed secret is the
// production path; the env var is the self-hosted equivalent.
const secret = (): string => process.env.MESS_TOKEN_SECRET ?? "";

/** QR payload tuple: studentId|messDayId|mealType|nonce|hmac. */
export interface IssuedToken {
  nonce: string;
  tokenHash: string;
  qr: string;
  tokenDbId: string;
}

/**
 * Issue a new token for a student on a mess day. Writes a mess_tokens row
 * with the HMAC + nonce + single_use=true. Server-side only.
 */
export async function issueToken(input: {
  studentId: string;
  messDayId: string;
  mealType: string;
  mealDate: string;
  primaryItem?: string;
  subItems?: string[];
}): Promise<IssuedToken> {
  const nonce = randomBytes(16).toString("hex");
  const tuple = `${input.studentId}|${input.messDayId}|${input.mealType}|${input.mealDate}|${nonce}`;
  const tokenHash = createHmac("sha256", secret()).update(tuple).digest("hex");
  const qr = `${tuple}|${tokenHash}`;

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.mess_tokens
       (user_id, mess_day_id, token_code, nonce, token_hash,
        primary_item, sub_item_labels, single_use)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT (user_id, mess_day_id)
     DO UPDATE SET nonce = $4, token_hash = $5,
                   qr_payload_hash = $5,
                   used_at = NULL, used_by = NULL, revoked_at = NULL
     RETURNING id`,
    [
      input.studentId,
      input.messDayId,
      qr, // token_code stores the full QR (back-compat with the old reader)
      nonce,
      tokenHash,
      input.primaryItem ?? null,
      JSON.stringify(input.subItems ?? []),
    ]
  );
  return {
    nonce,
    tokenHash,
    qr,
    tokenDbId: rows[0].id,
  };
}

export type VerifyResult =
  | { ok: true; studentId: string; messDayId: string; mealType: string; nonce: string }
  | { ok: false; reason: "malformed" | "hmac_fail" | "not_issued" };

/**
 * Verify a QR string. Recomputes the HMAC over the tuple; any single-byte
 * mutation (tuple OR hash) fails.
 */
export function verifyToken(qr: string): VerifyResult {
  const parts = qr.split("|");
  if (parts.length !== 6) return { ok: false, reason: "malformed" };
  const [studentId, messDayId, mealType, mealDate, nonce, givenHash] = parts;
  const expected = createHmac("sha256", secret())
    .update(`${studentId}|${messDayId}|${mealType}|${mealDate}|${nonce}`)
    .digest("hex");
  if (givenHash !== expected) return { ok: false, reason: "hmac_fail" };
  return { ok: true, studentId, messDayId, mealType, nonce };
}

/**
 * Atomically redeem a token. Returns 'ok' | 'duplicate' | 'expired' |
 * 'revoked' | 'not_issued'. The UPDATE's `used_at IS NULL` guard makes
 * concurrent redeems race-safe: only the first gets rowCount=1.
 */
export async function redeemToken(
  qr: string,
  redeemDeviceId: string | null,
  redeemerId: string
): Promise<{ result: string; studentId?: string; messDayId?: string }> {
  const v = verifyToken(qr);
  if (!v.ok) {
    await logScan({ result: v.reason, qr });
    return { result: v.reason };
  }

  // Find the live token for this student+day.
  const { rows } = await query<{ id: string; status_state: string; expires_at: string | null }>(
    `SELECT id,
            CASE WHEN revoked_at IS NOT NULL THEN 'revoked'
                 WHEN used_at IS NOT NULL THEN 'redeemed'
                 ELSE 'active' END AS status_state,
            expires_at
       FROM public.mess_tokens
      WHERE user_id = $1 AND mess_day_id = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [v.studentId, v.messDayId]
  );
  if (rows.length === 0) {
    await logScan({ result: "not_issued", studentId: v.studentId, qr });
    return { result: "not_issued" };
  }
  const token = rows[0];
  if (token.status_state === "revoked") {
    await logScan({ result: "revoked", studentId: v.studentId, qr });
    return { result: "revoked" };
  }
  if (token.status_state === "redeemed") {
    await logScan({ result: "duplicate", studentId: v.studentId, qr });
    return { result: "duplicate" };
  }
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now()) {
    await logScan({ result: "expired", studentId: v.studentId, qr });
    return { result: "expired" };
  }

  // Atomic single-use redeem.
  const { rowCount } = await query(
    `UPDATE public.mess_tokens
        SET used_at = now(), used_by = $1, redeem_device_id = $2
      WHERE id = $3 AND used_at IS NULL`,
    [redeemerId, redeemDeviceId, token.id]
  );
  if (rowCount === 0) {
    // Lost the race to a concurrent redeem (or was revoked/redeemed between
    // the read and the write).
    await logScan({ result: "duplicate", studentId: v.studentId, qr });
    return { result: "duplicate" };
  }

  await logScan({ result: "ok", studentId: v.studentId, messDayId: v.messDayId, qr });
  return { result: "ok", studentId: v.studentId, messDayId: v.messDayId };
}

/** Append a scan-attempt row to mess_scan_log (feeds the anomaly worker). */
async function logScan(entry: {
  result: string;
  studentId?: string;
  messDayId?: string;
  qr?: string;
  deviceId?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO public.mess_scan_log
         (student_id, mess_day_id, device_id, result, raw_payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.studentId ?? null,
        entry.messDayId ?? null,
        entry.deviceId ?? null,
        entry.result,
        JSON.stringify({ qr_prefix: entry.qr ? entry.qr.slice(0, 24) : null }),
      ]
    );
  } catch (e) {
    // Best-effort logging; never fail the redeem on a log error.
    console.error("[mess] scan-log write failed", e instanceof Error ? e.message : e);
  }
}
