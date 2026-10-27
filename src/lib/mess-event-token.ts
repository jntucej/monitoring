import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/postgres";
import { requireSecret } from "@/lib/env";
import { classifyHostelStatus } from "@/lib/mess-reviews";
import type { MealType } from "@/lib/mess-reviews";

// 6-char manual code alphabet — no 0/O/1/I/L to avoid misreads.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;
const BCRYPT_ROUNDS = 10;

export const TOKEN_MAX_FAILED_ATTEMPTS = 5;
export const TOKEN_LOCKOUT_MINUTES = 60;

function getSigningSecret(): string {
  return requireSecret("QR_TOKEN_SECRET", 32);
}

export interface TokenPayload {
  v: 1;
  jti: string;
  sub: string; // userId
  evt: string; // eventId
  iat: number; // unix seconds
  exp: number; // unix seconds
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  return `v1.${body}.${mac}`;
}

export function verifyTokenString(token: string): TokenPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, mac] = parts;
  const expected = createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<TokenPayload>;
  if (p.v !== 1 || typeof p.jti !== "string" || typeof p.sub !== "string" || typeof p.evt !== "string") return null;
  if (typeof p.iat !== "number" || typeof p.exp !== "number") return null;
  if (p.exp * 1000 < Date.now()) return null;
  return p as TokenPayload;
}

export function generateManualCode(): string {
  const buf = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

export async function hashManualCode(code: string): Promise<string> {
  return bcrypt.hash(code.toUpperCase(), BCRYPT_ROUNDS);
}

export async function checkManualCode(code: string, hash: string): Promise<boolean> {
  if (!code || !hash) return false;
  return bcrypt.compare(code.toUpperCase(), hash);
}

export function normalizeManualCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export interface IssuedToken {
  jti: string;
  qrToken: string;
  manualCode: string;
  itemIds: string[];
  itemLabels: string[];
  expiresAt: string;
}

/**
 * Issue (or return existing) token for a user+event. Caller must have already
 * verified: hostel student, interest exists, deadline passed, serving window.
 */
export async function issueToken(args: {
  userId: string;
  eventId: string;
  expiresAt: Date;
}): Promise<{ token: IssuedToken; created: boolean }> {
  const existing = await query<{
    jti: string; item_ids: string[]; item_labels: string[]; expires_at: string;
    used_at: string | null; revoked_at: string | null;
  }>(
    `SELECT jti, item_ids, item_labels, expires_at, used_at, revoked_at
       FROM public.mess_event_tokens
      WHERE user_id = $1 AND event_id = $2`,
    [args.userId, args.eventId],
  );
  const row = existing.rows[0];
  if (row) {
    if (row.used_at) throw new Error("TOKEN_ALREADY_USED");
    if (row.revoked_at) throw new Error("TOKEN_REVOKED");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("TOKEN_EXPIRED");
    // Return existing QR (manual code is unrecoverable — it's hashed).
    const payload: TokenPayload = {
      v: 1, jti: row.jti, sub: args.userId, evt: args.eventId,
      iat: Math.floor(new Date(row.expires_at).getTime() / 1000) - 3600,
      exp: Math.floor(new Date(row.expires_at).getTime() / 1000),
    };
    return {
      created: false,
      token: {
        jti: row.jti,
        qrToken: signToken(payload),
        manualCode: "",
        itemIds: row.item_ids,
        itemLabels: row.item_labels,
        expiresAt: row.expires_at,
      },
    };
  }

  const manualCode = generateManualCode();
  const manualHash = await hashManualCode(manualCode);
  const jti = randomBytes(16).toString("hex");

  const { rows: interests } = await query<{ item_id: string; label: string }>(
    `SELECT i.item_id, si.label
       FROM public.mess_special_interests i
       JOIN public.mess_special_items si ON si.id = i.item_id
      WHERE i.user_id = $1 AND i.event_id = $2
      ORDER BY si.sort_order, si.label`,
    [args.userId, args.eventId],
  );
  if (interests.length === 0) throw new Error("NO_INTERESTS");

  const itemIds = interests.map((r) => r.item_id);
  const itemLabels = interests.map((r) => r.label);
  const expiresAtIso = args.expiresAt.toISOString();

  await query(
    `INSERT INTO public.mess_event_tokens
       (event_id, user_id, jti, manual_code_hash, item_ids, item_labels, expires_at)
     VALUES ($1,$2,$3,$4,$5::uuid[],$6::text[],$7)`,
    [args.eventId, args.userId, jti, manualHash, itemIds, itemLabels, expiresAtIso],
  );

  const payload: TokenPayload = {
    v: 1, jti, sub: args.userId, evt: args.eventId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(args.expiresAt.getTime() / 1000),
  };

  return {
    created: true,
    token: {
      jti,
      qrToken: signToken(payload),
      manualCode,
      itemIds,
      itemLabels,
      expiresAt: expiresAtIso,
    },
  };
}

export interface VerifyResult {
  ok: true;
  tokenId: string;
  userId: string;
  name: string;
  uniqueId: string;
  itemIds: string[];
  itemLabels: string[];
  method: "QR" | "MANUAL";
  expiresAt: string;
}

export type VerifyFailure = {
  ok: false;
  code:
    | "INVALID_QR" | "INVALID_ROLL" | "INVALID_CODE" | "TOKEN_NOT_FOUND"
    | "TOKEN_USED" | "TOKEN_REVOKED" | "TOKEN_EXPIRED" | "TOKEN_LOCKED"
    | "NOT_HOSTEL_STUDENT" | "EVENT_NOT_ACTIVE" | "EVENT_NOT_IN_WINDOW";
  message: string;
};

function fail(code: VerifyFailure["code"], message: string): VerifyFailure {
  return { ok: false, code, message };
}

/**
 * M4: audit an event-token verification/consumption failure. Fire-and-forget
 * so a failed audit write never blocks the verification path. Writes to
 * audit_logs directly (service-role pool), not addAudit (which uses RLS).
 */
export async function auditEventTokenEvent(
  event: string,
  tokenId: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
       SELECT $1, t.user_id, u.name, u.role,
              jsonb_build_object('token_id', t.id, 'event_id', t.event_id, $2::jsonb)
         FROM public.mess_event_tokens t
         JOIN public.users u ON u.id = t.user_id
        WHERE t.id = $3`,
      [event, JSON.stringify(details), tokenId],
    );
  } catch (err) {
    console.error(`[mess-event-token] audit ${event} failed:`, err);
  }
}

interface VerifyRow {
  id: string; user_id: string; event_id: string;
  used_at: string | null; revoked_at: string | null; expires_at: string;
  failed_attempts: number; locked_until: string | null;
  item_ids: string[]; item_labels: string[];
  name: string; unique_id: string; role: string;
  student_type: string | null; current_entry_type: string | null; hostel_block: string | null;
  event_status: string; serving_start_at: string; serving_end_at: string;
}

function evaluateRow(row: VerifyRow, method: "QR" | "MANUAL"): VerifyResult | VerifyFailure {
  if (row.used_at) return fail("TOKEN_USED", "Token already used");
  if (row.revoked_at) return fail("TOKEN_REVOKED", "Token revoked");
  if (new Date(row.expires_at).getTime() < Date.now()) return fail("TOKEN_EXPIRED", "Token expired");
  if (row.event_status === "CANCELLED") return fail("EVENT_NOT_ACTIVE", "Event was cancelled");
  if (row.event_status === "CLOSED") return fail("EVENT_NOT_ACTIVE", "Event is closed");
  const now = Date.now();
  const start = new Date(row.serving_start_at).getTime();
  const end = new Date(row.serving_end_at).getTime();
  if (now < start) return fail("EVENT_NOT_IN_WINDOW", "Serving has not started yet");
  if (now > end) return fail("EVENT_NOT_IN_WINDOW", "Serving window has ended");
  const hostel = classifyHostelStatus({
    role: row.role,
    student_type: row.student_type,
    current_entry_type: row.current_entry_type,
    hostel_block: row.hostel_block,
  });
  if (!hostel.isHostelStudent) {
    return fail(
      "NOT_HOSTEL_STUDENT",
      hostel.reason === "day_scholar"
        ? "Day scholars are not eligible for hostel mess tokens"
        : "Only hostel students can redeem mess tokens",
    );
  }
  return {
    ok: true,
    tokenId: row.id,
    userId: row.user_id,
    name: row.name,
    uniqueId: row.unique_id,
    itemIds: row.item_ids,
    itemLabels: row.item_labels,
    method,
    expiresAt: row.expires_at,
  };
}

/** Non-destructive verify: checks everything, returns details, does NOT consume. */
export async function verifyQrToken(qrToken: string): Promise<VerifyResult | VerifyFailure> {
  const payload = verifyTokenString(qrToken);
  if (!payload) return fail("INVALID_QR", "Invalid or expired QR code");
  const { rows } = await query<VerifyRow>(
    `SELECT t.id, t.user_id, t.event_id, t.used_at, t.revoked_at, t.expires_at,
            t.failed_attempts, t.locked_until, t.item_ids, t.item_labels,
            u.name, u.unique_id, u.role,
            sd.student_type, sd.current_entry_type, sd.hostel_block,
            e.status AS event_status, e.serving_start_at, e.serving_end_at
       FROM public.mess_event_tokens t
       JOIN public.users u ON u.id = t.user_id
       LEFT JOIN public.student_details sd ON sd.user_id = t.user_id
       JOIN public.mess_special_events e ON e.id = t.event_id
      WHERE t.jti = $1`,
    [payload.jti],
  );
  const row = rows[0];
  if (!row) return fail("TOKEN_NOT_FOUND", "Token not found");
  return evaluateRow(row, "QR");
}

async function recordFailedAttempt(tokenId: string): Promise<void> {
  const { rows } = await query<{ failed_attempts: number }>(
    `UPDATE public.mess_event_tokens
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE WHEN failed_attempts + 1 >= $2
                               THEN NOW() + ($3 || ' minutes')::interval
                               ELSE locked_until END
      WHERE id = $1
      RETURNING failed_attempts`,
    [tokenId, TOKEN_MAX_FAILED_ATTEMPTS, String(TOKEN_LOCKOUT_MINUTES)],
  );
  if ((rows[0]?.failed_attempts ?? 0) >= TOKEN_MAX_FAILED_ATTEMPTS) {
    await query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
       SELECT 'MESS_TOKEN_MANUAL_LOCKED', t.user_id, u.name, u.role,
              jsonb_build_object('token_id', t.id, 'event_id', t.event_id)
         FROM public.mess_event_tokens t
         JOIN public.users u ON u.id = t.user_id
        WHERE t.id = $1`,
      [tokenId],
    );
  }
}

export async function verifyManualCode(
  roll: string,
  rawCode: string,
): Promise<VerifyResult | VerifyFailure> {
  const code = normalizeManualCode(rawCode);
  if (!code || code.length !== CODE_LENGTH) return fail("INVALID_CODE", "Invalid code format");
  const { rows } = await query<(VerifyRow & { manual_code_hash: string })>(
    `SELECT t.id, t.user_id, t.event_id, t.used_at, t.revoked_at, t.expires_at,
            t.failed_attempts, t.locked_until, t.item_ids, t.item_labels,
            t.manual_code_hash,
            u.name, u.unique_id, u.role,
            sd.student_type, sd.current_entry_type, sd.hostel_block,
            e.status AS event_status, e.serving_start_at, e.serving_end_at
       FROM public.mess_event_tokens t
       JOIN public.users u ON u.id = t.user_id
       LEFT JOIN public.student_details sd ON sd.user_id = t.user_id
       JOIN public.mess_special_events e ON e.id = t.event_id
      WHERE u.unique_id = $1 AND t.used_at IS NULL AND t.revoked_at IS NULL
      ORDER BY t.issued_at DESC
      LIMIT 1`,
    [roll.trim().toUpperCase()],
  );
  const row = rows[0];
  if (!row) return fail("INVALID_ROLL", "No active token found for this roll number");
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return fail("TOKEN_LOCKED", "Too many wrong codes. Try again later.");
  }
  const match = await checkManualCode(code, row.manual_code_hash);
  if (!match) {
    // M5: only count a failure when the code was well-formed AND a real
    // token exists for this roll. A typos in the roll / code don't lock
    // out a legit student.
    if (code.length === CODE_LENGTH) {
      await recordFailedAttempt(row.id);
      await auditEventTokenEvent("MESS_TOKEN_VERIFY_FAILED", row.id, {
        method: "MANUAL",
        reason: "code_mismatch",
      });
    }
    return fail("INVALID_CODE", "Wrong code");
  }
  return evaluateRow(row, "MANUAL");
}

/** Atomically consume a token. Returns the details or a failure. */
export async function serveToken(
  tokenId: string,
  servedByUserId: string,
  method: "QR" | "MANUAL",
): Promise<VerifyResult | VerifyFailure> {
  const { rows } = await query<{
    id: string; user_id: string; item_ids: string[]; item_labels: string[]; expires_at: string;
  }>(
    `UPDATE public.mess_event_tokens
        SET used_at = NOW(), used_by = $2, used_method = $3
      WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
        AND expires_at > NOW()
      RETURNING id, user_id, item_ids, item_labels, expires_at`,
    [tokenId, servedByUserId, method],
  );
  const row = rows[0];
  if (!row) return fail("TOKEN_USED", "Token already used or expired");
  await auditEventTokenEvent("MESS_EVENT_TOKEN_SERVED", row.id, {
    servedBy: servedByUserId,
    method,
  });
  const { rows: userRows } = await query<{ name: string; unique_id: string }>(
    `SELECT name, unique_id FROM public.users WHERE id = $1`,
    [row.user_id],
  );
  const u = userRows[0];
  return {
    ok: true,
    tokenId: row.id,
    userId: row.user_id,
    name: u?.name ?? "Unknown",
    uniqueId: u?.unique_id ?? "",
    itemIds: row.item_ids,
    itemLabels: row.item_labels,
    method,
    expiresAt: row.expires_at,
  };
}

export async function revokeToken(
  tokenId: string,
  revokedByUserId: string,
  reason: string,
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE public.mess_event_tokens
        SET revoked_at = NOW(), revoked_by = $2
      WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [tokenId, revokedByUserId],
  );
  if (rowCount && rowCount > 0) {
    await query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
       VALUES ('MESS_TOKEN_REVOKED', $1, NULL, NULL,
               jsonb_build_object('token_id', $2, 'reason', $3))`,
      [revokedByUserId, tokenId, reason],
    );
  }
  return (rowCount ?? 0) > 0;
}

export type { MealType };

// M15: regenerate the manual code for an existing event token when the student
// lost it. The QR is re-derivable (it's a JWT), but the manual code is stored
// as a bcrypt hash so we can reissue a fresh one without minting a new token.
export async function regenerateManualCode(
  tokenId: string,
  userId: string,
): Promise<{ ok: true; manualCode: string } | { ok: false; error: string }> {
  const { rows } = await query<{ manual_code_hash: string; used_at: string | null; revoked_at: string | null }>(
    `SELECT manual_code_hash, used_at, revoked_at
       FROM public.mess_event_tokens WHERE id = $1 LIMIT 1`,
    [tokenId],
  );
  const row = rows[0];
  if (!row || row.used_at || row.revoked_at) {
    return { ok: false, error: "Token not found, used, or revoked" };
  }
  const code = generateManualCode();
  const hash = await hashManualCode(code);
  await query(
    `UPDATE public.mess_event_tokens SET manual_code_hash = $2 WHERE id = $1`,
    [tokenId, hash],
  );
  await auditEventTokenEvent("MESS_EVENT_TOKEN_MANUAL_CODE_REGEN", tokenId, { by: userId });
  return { ok: true, manualCode: code };
}
