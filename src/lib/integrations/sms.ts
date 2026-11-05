import { errMsg } from "@/lib/err-msg";
import { randomBytes } from "crypto";
import { SMSMessage } from "@/lib/integration-types";
import { getDbClient } from "@/lib/db";
import { AppError } from "@/server/http/errors";
import { isAutomationEnabled } from "@/lib/kill-switch";

// Configuration. Mirrors the worker's dispatch job (worker/jobs/
// dispatch_notifications.js): the real transport is the Twilio REST API,
// keyed by SMS_ACCOUNT_SID + SMS_AUTH_TOKEN (+ SMS_FROM). SMS_API_KEY /
// SMS_API_SECRET are accepted as credential aliases so existing .env files
// keep working.
const SMS_CONFIG = {
  enabled: process.env.SMS_ENABLED === "true",
  provider: process.env.SMS_PROVIDER || "twilio",
  from: process.env.SMS_FROM || "",
  accountSid: process.env.SMS_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || process.env.SMS_API_KEY || "",
  authToken: process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.SMS_API_SECRET || "",
};

/**
 * Real Twilio REST send (same transport the worker dispatch job uses).
 * Resolves only when the provider accepted the message; throws otherwise.
 */
async function sendSmsViaProvider(to: string, body: string, from?: string): Promise<string> {
  const base = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(SMS_CONFIG.accountSid)}/Messages.json`;
  const payload = new URLSearchParams({
    To: to,
    From: (from && from !== "+" + from.replace(/[^0-9]/g, "")) ? from : (SMS_CONFIG.from || from || ""),
    Body: body,
  });
  const auth = Buffer.from(`${SMS_CONFIG.accountSid}:${SMS_CONFIG.authToken}`).toString("base64");
  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json().catch(() => ({}));
  return json.sid || json.messageSid || "";
}

// Send SMS message
export async function sendSMS(params: {
  to: string;
  message: string;
  from?: string;
}): Promise<SMSMessage | null> {
  try {
    const messageId = `sms_${Date.now()}_${randomBytes(4).toString("hex")}`;

    // Store in queue first
    const { error: queueError } = await getDbClient()
      .from("notification_sms_queue")
      .insert({
        id: messageId,
        phone_number: params.to,
        message: params.message,
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (queueError) {
      console.error("Error queueing SMS:", queueError);
      return null;
    }

    if (SMS_CONFIG.enabled) {
      // Batch I5: SMS kill switch. When auto_sms_enabled=FALSE the row stays
      // in the notification_sms_queue for later dispatch; no provider call.
      const smsSwitchOn = await isAutomationEnabled("auto_sms_enabled");
      if (!smsSwitchOn) {
        console.log("[SMS] auto_sms_enabled kill switch is OFF — leaving row 'pending' for later dispatch.");
        return null;
      }
      if (!SMS_CONFIG.accountSid || !SMS_CONFIG.authToken) {
        if (process.env.NODE_ENV === "production") {
          throw new AppError("SMS_NOT_CONFIGURED", "SMS service is not configured in production environment", 500);
        }
        console.warn("[SMS] SMS_ENABLED=true but SMS_ACCOUNT_SID/SMS_AUTH_TOKEN are not configured — leaving the row 'pending' for the worker dispatch job.");
        return null;
      }

      try {
        // Real provider send. The row is marked 'delivered' ONLY after the
        // Twilio API accepted the message; on a real error it is marked
        // 'failed' with the reason, and the function returns null.
        const sid = await sendSmsViaProvider(params.to, params.message, params.from);
        await getDbClient()
          .from("notification_sms_queue")
          .update({
            status: "delivered",
            sent_at: new Date().toISOString(),
            provider_message_id: sid,
          })
          .eq("id", messageId);

        return {
          id: messageId,
          to: params.to,
          from: params.from || SMS_CONFIG.from,
          message: params.message,
          status: "delivered",
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        const reason = String(errMsg(error) ?? error).slice(0, 500);
        console.error("Error sending SMS:", reason);
        await getDbClient()
          .from("notification_sms_queue")
          .update({
            status: "failed",
            error: reason,
          })
          .eq("id", messageId);
        return null;
      }
    } else {
      // Development mode: the row stays in the queue for the worker dispatch
      // job (which logs loudly and, when SMS_ENABLED flips on later, delivers
      // it). We do NOT claim 'sent' here — the message was not sent.
      console.log(`[SMS Dev Mode] To: ${params.to}, Message: ${params.message} (row left 'pending' for the dispatch worker)`);
      return {
        id: messageId,
        to: params.to,
        from: params.from || SMS_CONFIG.from,
        message: params.message,
        status: "pending",
        sentAt: "",
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error in sendSMS:", errMsg(error) ?? error);
    return null;
  }
}

// Send bulk SMS
export async function sendBulkSMS(params: {
  to: string[];
  message: string;
  from?: string;
}): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const to of params.to) {
    const result = await sendSMS({ to, message: params.message, from: params.from });
    if (result) {
      sent++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, sent, failed };
}

// Send emergency alert via SMS
export async function sendEmergencySMS(
  recipients: string[],
  message: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  const fullMessage = `🚨 EMERGENCY ALERT 🚨\n\n${message}\n\nPlease follow instructions from campus security.`;
  return sendBulkSMS({
    to: recipients,
    message: fullMessage,
  });
}

// Get SMS delivery status
export async function getSMSStatus(messageId: string): Promise<string> {
  const { data, error } = await getDbClient()
    .from("notification_sms_queue")
    .select("status")
    .eq("id", messageId)
    .single();

  if (error || !data) {
    return "unknown";
  }

  return data.status;
}
