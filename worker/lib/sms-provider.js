// Plain-JS twin of src/lib/integrations/sms-provider.ts for the worker image.
// No path aliases, no TS — same MSG91/Twilio transport.

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/";

const TWILIO_SID =
  process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID || "";
const TWILIO_TOKEN =
  process.env.TWILIO_AUTH_TOKEN ||
  process.env.SMS_AUTH_TOKEN ||
  process.env.SMS_API_SECRET ||
  "";
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || process.env.SMS_FROM || "";

export function normalizePhone(raw) {
  if (!raw) return null;
  const d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+91") && d.length === 13) return d;
  if (d.startsWith("91") && d.length === 12) return "+" + d;
  if (d.startsWith("0") && d.length === 11) return "+91" + d.slice(1);
  if (/^\d{10}$/.test(d)) return "+91" + d;
  if (d.startsWith("+")) return d;
  return null;
}

async function viaMsg91(row) {
  if (!MSG91_AUTH_KEY)
    return { ok: false, provider: "msg91", error: "MSG91_AUTH_KEY not set", permanent: false };
  // permanent:false — row retries until the sysadmin fills in the DLT template ID
  if (!row.dlt_template_id)
    return {
      ok: false,
      provider: "msg91",
      error: "DLT template ID missing — register the template first",
      permanent: false,
    };
  const to = normalizePhone(row.phone_number);
  if (!to)
    return { ok: false, provider: "msg91", error: "Invalid phone", permanent: true };

  const res = await fetch(MSG91_FLOW_URL, {
    method: "POST",
    headers: { authkey: MSG91_AUTH_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: row.dlt_template_id,
      sender: row.sender_id || "JNTUCE",
      short_url: "0",
      recipients: [{ mobiles: to.replace("+", "") }],
    }),
  });

  if (res.ok) {
    const json = await res.json().catch(() => ({}));
    if (json.type === "success")
      return { ok: true, provider: "msg91", providerId: row.tracking_id || "", costInr: 0.2 };
    return {
      ok: false,
      provider: "msg91",
      error: json.message || "MSG91 failed",
      permanent: /invalid|dnd|blackout/i.test(json.message || ""),
    };
  }
  return {
    ok: false,
    provider: "msg91",
    error: `MSG91 ${res.status}`,
    permanent: res.status === 400 || res.status === 422,
  };
}

async function viaTwilio(row) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM)
    return { ok: false, provider: "twilio", error: "Twilio not configured", permanent: false };
  const to = normalizePhone(row.phone_number);
  if (!to) return { ok: false, provider: "twilio", error: "Invalid phone", permanent: true };

  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: row.message });
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
    const j = await res.json().catch(() => ({}));
    return { ok: true, provider: "twilio", providerId: j.sid || "", costInr: 1.5 };
  }
  let text = "";
  try {
    text = await res.text();
  } catch {}
  return {
    ok: false,
    provider: "twilio",
    error: `Twilio ${res.status}: ${String(text).slice(0, 200)}`,
    permanent: res.status === 400,
  };
}

/**
 * row: a notification_sms_queue row with phone_number, message, priority,
 * sender_id, dlt_template_id, tracking_id fields.
 */
export async function sendSms(row) {
  const to = normalizePhone(row.phone_number);
  if (!to)
    return { ok: false, provider: "msg91", error: "Invalid phone", permanent: true };

  const isIndian = to.startsWith("+91");
  if (isIndian) {
    const r = await viaMsg91(row);
    if (r.ok || r.permanent) return r;
    const t = await viaTwilio(row);
    return t.ok ? t : { ...r, error: `${r.error} | ${t.error}` };
  }
  return viaTwilio(row);
}
