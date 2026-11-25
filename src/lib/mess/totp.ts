/**
 * src/lib/mess/totp.ts — Rotating TOTP + counter + HMAC QR for Mess v2.
 *
 * Format: MESS|{student_id}|{session_id}|{counter}|{totp}|{hmac}
 *   - totp: 6-digit HOTP(daily_secret, floor((now - session_start) / 30_000))
 *   - hmac: HMAC-SHA256(server_secret, "{student_id}|{session_id}|{counter}|{totp}")
 *
 * Mess is a separate subsystem from gate: zero writes to movement_logs or gate_events.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { query } from "@/lib/postgres";

function getServerSecret(): string {
  const s = process.env.MESS_TOKEN_SECRET || process.env.AUTH_JWT_SECRET;
  if (!s) {
    throw new Error("MESS_TOKEN_SECRET (or AUTH_JWT_SECRET) is not configured");
  }
  return s;
}

function deriveAesKey(): Buffer {
  return createHmac("sha256", getServerSecret()).update("mess-totp-aes-key").digest();
}

export function encryptSecret(plainHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveAesKey(), iv);
  const enc = Buffer.concat([cipher.update(plainHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(packed: string): string {
  const [ivHex, tagHex, encHex] = packed.split(":");
  if (!ivHex || !tagHex || !encHex) {
    throw new Error("Malformed encrypted TOTP secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveAesKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/**
 * Generate and persist a 20-byte daily TOTP secret for (studentId, day).
 * Idempotent: if a secret already exists for that day, returns the existing one.
 */
export async function issueDailySecret(
  studentId: string,
  day: string,
): Promise<string> {
  const rawHex = randomBytes(20).toString("hex");
  const enc = encryptSecret(rawHex);
  await query(
    `INSERT INTO public.mess_totp_secrets (student_id, secret_day, secret_enc)
     VALUES ($1::uuid, $2::date, $3)
     ON CONFLICT (student_id, secret_day) DO NOTHING`,
    [studentId, day, enc],
  );
  const { rows } = await query<{ secret_enc: string }>(
    `SELECT secret_enc FROM public.mess_totp_secrets
      WHERE student_id = $1::uuid AND secret_day = $2::date
      LIMIT 1`,
    [studentId, day],
  );
  return decryptSecret(rows[0].secret_enc);
}

export async function getDailySecret(
  studentId: string,
  day: string,
): Promise<string | null> {
  const { rows } = await query<{ secret_enc: string }>(
    `SELECT secret_enc FROM public.mess_totp_secrets
      WHERE student_id = $1::uuid AND secret_day = $2::date
      LIMIT 1`,
    [studentId, day],
  );
  if (!rows[0]) return null;
  return decryptSecret(rows[0].secret_enc);
}

/**
 * RFC 6238 / HOTP over 30-second steps from sessionStartMs.
 */
export function currentTotp(
  secretHex: string,
  sessionStartMs: number,
  nowMs: number = Date.now(),
  stepOffset: number = 0,
): string {
  const step = Math.floor((nowMs - sessionStartMs) / 30_000) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(Math.max(0, step)));
  const hmac = createHmac("sha1", Buffer.from(secretHex, "hex"))
    .update(counterBuf)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function signQrPayload(
  studentId: string,
  sessionId: string,
  counter: number,
  totp: string,
): string {
  const body = `${studentId}|${sessionId}|${counter}|${totp}`;
  return createHmac("sha256", getServerSecret()).update(body).digest("hex");
}

export function buildQr(
  studentId: string,
  sessionId: string,
  counter: number,
  totp: string,
): string {
  const hmac = signQrPayload(studentId, sessionId, counter, totp);
  return `MESS|${studentId}|${sessionId}|${counter}|${totp}|${hmac}`;
}

export type VerifyQrResult =
  | {
      ok: true;
      studentId: string;
      sessionId: string;
      counter: number;
      totp: string;
    }
  | {
      ok: false;
      reason: "malformed" | "wrong_session" | "tampered" | "invalid_code";
      studentId?: string;
    };

/**
 * Pure verification of a rotating QR against expected sessionId, sessionStartMs,
 * and the student's decrypted daily secret. Accepts current ± 1 TOTP window.
 */
export function verifyQr(
  qr: string,
  expectedSessionId: string,
  sessionStartMs: number,
  secretHex: string,
  nowMs: number = Date.now(),
): VerifyQrResult {
  const parts = qr.trim().split("|");
  if (parts.length !== 6 || parts[0] !== "MESS") {
    return { ok: false, reason: "malformed" };
  }
  const [, studentId, sessionId, counterStr, totp, givenHmac] = parts;
  const counter = Number(counterStr);
  if (!studentId || !sessionId || !Number.isInteger(counter) || counter < 1 || !totp || !givenHmac) {
    return { ok: false, reason: "malformed", studentId: studentId || undefined };
  }
  if (sessionId !== expectedSessionId) {
    return { ok: false, reason: "wrong_session", studentId };
  }

  const expectedHmac = signQrPayload(studentId, sessionId, counter, totp);
  const a = Buffer.from(givenHmac, "hex");
  const b = Buffer.from(expectedHmac, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "tampered", studentId };
  }

  const validWindow = [-1, 0, 1].some(
    (offset) => currentTotp(secretHex, sessionStartMs, nowMs, offset) === totp,
  );
  if (!validWindow) {
    return { ok: false, reason: "invalid_code", studentId };
  }

  return { ok: true, studentId, sessionId, counter, totp };
}
