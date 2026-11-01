/**
 * MSG91 (primary, India-native, DLT-compliant) + Twilio (fallback,
 * international / NRI parents) provider abstraction for SMS dispatch.
 *
 * Never throws — returns a structured result so the caller can decide
 * retry vs. dead-letter.
 *
 * India note: TRAI DLT registration (entity → sender ID → template) is
 * required before any SMS delivers to Indian numbers. Register at
 * https://www.vilpower.in/ before going live. Templates store DLT-compliant
 * {#var#} syntax; MSG91's flow API does server-side substitution.
 */

export interface SendSmsInput {
  to: string; // E.164 (+91XXXXXXXXXX or international)
  body: string; // rendered body (variables already substituted)
  senderId?: string; // 6-char DLT header, default 'JNTUCE'
  dltTemplateId?: string; // required for MSG91; optional for Twilio
  priority?: "normal" | "urgent" | "otp";
  trackingId?: string;
}

export interface SendSmsResult {
  ok: boolean;
  provider: "msg91" | "twilio";
  providerId?: string;
  costInr?: number;
  error?: string;
  /** true → don't retry; false → safe to retry after backoff */
  permanent?: boolean;
}

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY ?? "";
const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/";

const TWILIO_SID =
  process.env.TWILIO_ACCOUNT_SID ?? process.env.SMS_ACCOUNT_SID ?? "";
const TWILIO_TOKEN =
  process.env.TWILIO_AUTH_TOKEN ??
  process.env.SMS_AUTH_TOKEN ??
  process.env.SMS_API_SECRET ??
  "";
const TWILIO_FROM =
  process.env.TWILIO_FROM_NUMBER ?? process.env.SMS_FROM ?? "";

/**
 * Normalize Indian / international numbers to E.164.
 * Accepts 10-digit, +91..., 0-prefixed, and already-international forms.
 */
export function normalizePhone(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+91") && digits.length === 13) return digits;
  if (digits.startsWith("91") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 11)
    return "+91" + digits.slice(1);
  if (/^\d{10}$/.test(digits)) return "+91" + digits;
  if (digits.startsWith("+")) return digits; // international — pass through
  return null;
}

async function viaMsg91(input: SendSmsInput): Promise<SendSmsResult> {
  if (!MSG91_AUTH_KEY)
    return {
      ok: false,
      provider: "msg91",
      error: "MSG91_AUTH_KEY not set",
      permanent: false,
    };
  // A missing DLT template ID means the template hasn't been registered yet.
  // permanent:false → the row goes to 'failed' and retries on backoff until
  // the sysadmin fills in dlt_template_id, at which point retry succeeds.
  if (!input.dltTemplateId)
    return {
      ok: false,
      provider: "msg91",
      error: "DLT template ID missing — register the template first",
      permanent: false,
    };

  const res = await fetch(MSG91_FLOW_URL, {
    method: "POST",
    headers: { authkey: MSG91_AUTH_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: input.dltTemplateId,
      sender: input.senderId ?? "JNTUCE",
      short_url: "0",
      recipients: [{ mobiles: normalizePhone(input.to)?.replace("+", "") }],
    }),
  });

  if (res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      type?: string;
      message?: string;
    };
    if (json.type === "success") {
      return {
        ok: true,
        provider: "msg91",
        providerId: input.trackingId ?? "",
        costInr: 0.2,
      };
    }
    return {
      ok: false,
      provider: "msg91",
      error: json.message || "MSG91 send failed",
      permanent: /invalid|rejected|blackout|dnd/i.test(json.message ?? ""),
    };
  }
  return {
    ok: false,
    provider: "msg91",
    error: `MSG91 ${res.status}`,
    permanent: res.status === 400 || res.status === 422,
  };
}

async function viaTwilio(input: SendSmsInput): Promise<SendSmsResult> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return {
      ok: false,
      provider: "twilio",
      error: "Twilio credentials not set",
      permanent: false,
    };
  }
  const to = normalizePhone(input.to);
  if (!to) return { ok: false, provider: "twilio", error: "Invalid phone", permanent: true };
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: input.body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (res.ok) {
    const json = (await res.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, provider: "twilio", providerId: json.sid ?? "", costInr: 1.5 };
  }
  let body = "";
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }
  return {
    ok: false,
    provider: "twilio",
    error: `Twilio ${res.status}: ${body.slice(0, 200)}`,
    permanent: res.status === 400,
  };
}

/**
 * Try MSG91 first for Indian numbers; fall back to Twilio on transient
 * failure. International numbers go straight to Twilio.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const to = normalizePhone(input.to);
  if (!to)
    return {
      ok: false,
      provider: "msg91",
      error: `Invalid phone: ${input.to}`,
      permanent: true,
    };

  const isIndian = to.startsWith("+91");

  if (isIndian) {
    const r = await viaMsg91({ ...input, to });
    if (r.ok || r.permanent) return r;
    const t = await viaTwilio({ ...input, to });
    return t.ok ? t : { ...r, error: `${r.error} | ${t.error}` };
  }
  return viaTwilio({ ...input, to });
}

export function isSmsConfigured(): boolean {
  return Boolean(MSG91_AUTH_KEY || (TWILIO_SID && TWILIO_TOKEN));
}
