// src/lib/privileged-alert.ts
// ─────────────────────────────────────────────────────────────────────────────
// M2 — Privileged login alert + one-click lock.
//
// On every successful login to a privileged role, enqueues an SMS + email
// with the login time, IP, user agent, and a signed "this wasn't me" link.
// The link consumes a one-use lock token (HMAC-signed, 24 h expiry) that
// immediately SUSPENDs the account and revokes all sessions.
//
// Never throws: a failure here must not block the login.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual, createHash } from "crypto";
import { query } from "@/lib/postgres";
import { requireSecret } from "@/lib/env";
import { enqueueTemplatedSms } from "@/lib/sms-templates";
import { sendEmail } from "@/lib/integrations/email";
import type { Role } from "@/lib/types";

const PRIVILEGED = new Set<Role | string>([
  "sysadmin", "admin", "principal", "vice_principal",
  "hostel_manager", "warden", "deputy_warden",
]);

export function isPrivilegedRole(role: string): boolean {
  return PRIVILEGED.has(role);
}

/**
 * Issue a one-use lock token (HMAC-signed, 24 h expiry).
 * Payload: base64url(userId:sessionId:expires:sig).
 */
export function issueLockToken(userId: string, sessionId: string): string {
  const secret = requireSecret("LOCK_LINK_SECRET", 16);
  const expires = Math.floor(Date.now() / 1000) + 86_400;
  const payload = `${userId}:${sessionId}:${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return Buffer.from(payload + ":" + sig).toString("base64url");
}

/**
 * Verify a lock token. Returns { userId, sessionId } or null when the token
 * is malformed, expired, or the HMAC does not match.
 */
export function verifyLockToken(token: string): { userId: string; sessionId: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length !== 4) return null;
    const [userId, sessionId, expiresStr, sig] = parts;
    const expires = Number(expiresStr);
    if (!expires || expires < Math.floor(Date.now() / 1000)) return null;
    const secret = requireSecret("LOCK_LINK_SECRET", 16);
    const expected = createHmac("sha256", secret)
      .update(`${userId}:${sessionId}:${expires}`)
      .digest("base64url");
    if (sig.length !== expected.length) return null;
    // Both are ASCII strings; compare bytes in equal-length form.
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return { userId, sessionId };
  } catch {
    return null;
  }
}

/** SHA-256 of a lock token — stored in privileged_login_alerts for one-use tracking. */
export function lockTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Called from /api/auth/login after a successful login to a privileged role.
 * Enqueues an urgent SMS + email with the login details and a lock link.
 * Fire-and-forget: all failures are swallowed and a system_alert row is
 * persisted so the operator can see the alert pipeline broke.
 */
export async function sendPrivilegedLoginAlert(input: {
  userId: string;
  email: string;
  name: string;
  role: string;
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    const token = issueLockToken(input.userId, input.sessionId);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const lockUrl = `${base}/lock?t=${token}`;
    const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Record the alert row first (so the one-use token is tracked even if the
    // SMS/email queues fail).
    await query(
      `INSERT INTO public.privileged_login_alerts
         (user_id, session_id, ip, user_agent, lock_token_hash)
       VALUES ($1, $2::uuid, $3, $4, $5)`,
      [input.userId, input.sessionId, input.ip, input.userAgent, lockTokenHash(token)],
    ).catch(() => undefined);

    // SMS (best-effort — skip if no phone on file).
    const phoneRes = await query<{ phone: string | null }>(
      "SELECT phone FROM public.users WHERE id = $1",
      [input.userId],
    );
    if (phoneRes.rows[0]?.phone) {
      await enqueueTemplatedSms({
        templateCode: "privileged_login_alert",
        to: phoneRes.rows[0].phone,
        vars: {
          name: input.name.split(" ")[0] ?? input.name,
          role: input.role,
          time: when,
          ip: input.ip ?? "unknown",
        },
        priority: "urgent",
      }).catch(() => undefined);
    }

    // Email (always attempted).
    const body = [
      `Hi ${input.name},`,
      ``,
      `We noticed a login to your ${input.role} account at JNTUCEJ Gate Monitor.`,
      ``,
      `Time: ${when} IST`,
      `IP: ${input.ip ?? "unknown"}`,
      `Device: ${(input.userAgent ?? "unknown").slice(0, 120)}`,
      ``,
      `If this was you, no action is needed.`,
      `If this was NOT you, click the button below to immediately lock your account:`,
      lockUrl,
      ``,
      `The link expires in 24 hours.`,
      `— JNTUCEJ Gate Monitor`,
    ].join("\n");

    await sendEmail({
      to: input.email,
      subject: `Security alert: new login to your ${input.role} account`,
      body,
    }).catch(() => undefined);
  } catch {
    // Alert pipeline failed — persist a warning so the operator knows.
    await query(
      `INSERT INTO public.system_alerts (severity, message, details, resolved)
       VALUES ('warning', 'privileged login alert failed', $1, FALSE)`,
      [JSON.stringify({ userId: input.userId, role: input.role })],
    ).catch(() => undefined);
  }
}
