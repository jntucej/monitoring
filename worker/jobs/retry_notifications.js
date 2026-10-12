/**
 * Retry failed notifications (email, SMS, push) with exponential backoff.
 * Reads from notification queues where status = "failed" AND attempts < 5.
 * Updates attempts count and resets status to "pending" for reprocessing.
 */

import { getDbClient } from "../src/lib/db.js";

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 5 * 60 * 1000; // 5 minutes base

async function retryNotifications() {
  const db = getDbClient();
  
  try {
    // Process email queue
    const { data: failedEmails, error: emailError } = await db
      .from("notification_email_queue")
      .select("id, attempts, created_at")
      .eq("status", "failed")
      .lt("attempts", MAX_ATTEMPTS);
    
    if (emailError) {
      console.error("[retry_notifications] Email query error:", emailError);
    } else if (failedEmails && failedEmails.length > 0) {
      console.log(`[retry_notifications] Retrying ${failedEmails.length} failed emails`);
      for (const email of failedEmails) {
        const attempts = (email.attempts || 0) + 1;
        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
        
        await db
          .from("notification_email_queue")
          .update({
            status: "pending",
            attempts,
            next_retry_at: nextRetryAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", email.id);
      }
    }

    // Process SMS queue
    const { data: failedSms, error: smsError } = await db
      .from("notification_sms_queue")
      .select("id, attempts, created_at")
      .eq("status", "failed")
      .lt("attempts", MAX_ATTEMPTS);
    
    if (smsError) {
      console.error("[retry_notifications] SMS query error:", smsError);
    } else if (failedSms && failedSms.length > 0) {
      console.log(`[retry_notifications] Retrying ${failedSms.length} failed SMS`);
      for (const sms of failedSms) {
        const attempts = (sms.attempts || 0) + 1;
        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
        
        await db
          .from("notification_sms_queue")
          .update({
            status: "pending",
            attempts,
            next_retry_at: nextRetryAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sms.id);
      }
    }

    // Process push queue
    const { data: failedPush, error: pushError } = await db
      .from("notification_push_queue")
      .select("id, attempts, created_at")
      .eq("status", "failed")
      .lt("attempts", MAX_ATTEMPTS);
    
    if (pushError) {
      console.error("[retry_notifications] Push query error:", pushError);
    } else if (failedPush && failedPush.length > 0) {
      console.log(`[retry_notifications] Retrying ${failedPush.length} failed push notifications`);
      for (const push of failedPush) {
        const attempts = (push.attempts || 0) + 1;
        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
        
        await db
          .from("notification_push_queue")
          .update({
            status: "pending",
            attempts,
            next_retry_at: nextRetryAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", push.id);
      }
    }
  } catch (err) {
    console.error("[retry_notifications] Unexpected error:", err);
  }
}

export default retryNotifications;