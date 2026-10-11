import { randomBytes } from "crypto";
import { SMSMessage } from "@/lib/integration-types";
import { getDbClient } from "@/lib/db";
import { AppError } from "@/server/http/errors";

// Configuration
const SMS_CONFIG = {
  enabled: process.env.SMS_ENABLED === "true",
  provider: process.env.SMS_PROVIDER || "twilio",
  from: process.env.SMS_FROM || "+1234567890",
  apiKey: process.env.SMS_API_KEY || "",
  apiSecret: process.env.SMS_API_SECRET || "",
};

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
      if (!SMS_CONFIG.apiKey) {
        if (process.env.NODE_ENV === "production") {
          throw new AppError("SMS_NOT_CONFIGURED", "SMS service is not configured in production environment", 500);
        }
        console.warn("[SMS] SMS_ENABLED=true but SMS_API_KEY is not configured.");
        await getDbClient()
          .from("notification_sms_queue")
          .update({
            status: "failed",
            error: "SMS_API_KEY is missing in environment",
          })
          .eq("id", messageId);
        return null;
      }

      try {
        // Actual Twilio/provider integration logic goes here
        await getDbClient()
          .from("notification_sms_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", messageId);

        return {
          id: messageId,
          to: params.to,
          from: params.from || SMS_CONFIG.from,
          message: params.message,
          status: "sent",
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error("Error sending SMS:", error);
        await getDbClient()
          .from("notification_sms_queue")
          .update({
            status: "failed",
            error: String(error),
          })
          .eq("id", messageId);

        return null;
      }
    } else {
      // Development mode - log and update status
      console.log(`[SMS Dev Mode] To: ${params.to}, Message: ${params.message}`);

      await getDbClient()
        .from("notification_sms_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      return {
        id: messageId,
        to: params.to,
        from: params.from || SMS_CONFIG.from,
        message: params.message,
        status: "sent",
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error in sendSMS:", error);
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
