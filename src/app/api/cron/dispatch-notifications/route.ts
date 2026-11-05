// src/app/api/cron/dispatch-notifications/route.ts
// POST /api/cron/dispatch-notifications — cron: drain the notification
// dispatch queues (email / sms / push) that live in worker/jobs/dispatch_notifications.js.
//
// Previously the job only existed in worker/jobs and was never scheduled from
// a cron route — so the notification queues could never drain.

import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";

/**
 * Real Twilio REST send for the cron path — same transport the worker
 * dispatch job (worker/jobs/dispatch_notifications.js) and the web client
 * (src/lib/integrations/sms.ts) use. Returns the provider message SID on
 * success, or null after logging + marking the row appropriately:
 *   - provider misconfigured (SMS_ENABLED unset or credentials incomplete)
 *     → row stays 'pending' (next run retries), loud log;
 *   - provider error (HTTP != 2xx / network)
 *     → row marked 'failed' with the reason.
 */
async function sendSmsViaProvider(item: {
  id: string;
  phone_number: string;
  message: string;
}): Promise<string | null> {
  const accountSid =
    process.env.SMS_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || process.env.SMS_API_KEY || "";
  const authToken =
    process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.SMS_API_SECRET || "";

  if (process.env.SMS_ENABLED !== "true") {
    console.warn(
      `[cron/dispatch-notifications] sms row ${item.id} skipped: SMS_ENABLED is not 'true' — leaving 'pending'`
    );
    return null;
  }
  if (!accountSid || !authToken) {
    console.warn(
      `[cron/dispatch-notifications] sms row ${item.id} skipped: SMS_ACCOUNT_SID/SMS_AUTH_TOKEN incomplete — leaving 'pending'`
    );
    return null;
  }

  const from = process.env.SMS_FROM || "";
  const base = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const payload = new URLSearchParams({
    To: item.phone_number,
    From: from,
    Body: item.message,
  });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  try {
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
      const reason = `Twilio ${res.status}: ${text.slice(0, 300)}`;
      await query(
        `UPDATE notification_sms_queue SET status = 'failed', error = $2 WHERE id = $1`,
        [item.id, reason]
      );
      console.error(`[cron/dispatch-notifications] sms ${item.id} failed: ${reason}`);
      return null;
    }
    const json = await res.json().catch(() => ({}));
    return json.sid || json.messageSid || "";
  } catch (err) {
    const reason = String((err as any)?.message ?? err).slice(0, 500);
    await query(
      `UPDATE notification_sms_queue SET status = 'failed', error = $2 WHERE id = $1`,
      [item.id, reason]
    );
    console.error(`[cron/dispatch-notifications] sms ${item.id} send error: ${reason}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const queues = ["email", "sms", "push"];
    const results: Record<string, number> = {};

    for (const queue of queues) {
      const tableName = `notification_${queue}_queue`;
      const { rows } = await query(
        `SELECT id, status, attempts FROM ${tableName} WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`,
      );
      if (rows.length === 0) {
        results[queue] = 0;
        continue;
      }
      results[queue] = rows.length;

      for (const item of rows) {
        if (queue === "email") {
          // Email is owned by the worker's send_emails.js job (Brevo SMTP,
          // daily cap). This cron endpoint must NOT mark email rows 'sent'
          // — it would race the real transport and claim deliveries that
          // were not made. Report the backlog and leave it alone.
          continue;
        }
        if (queue === "push") {
          // No push transport is configured; report and leave pending.
          continue;
        }
        // SMS: delegate to the real transport (same Twilio REST call the
        // worker dispatch job makes). The row is only marked 'delivered'
        // when the provider accepted it; on a real error it is marked
        // 'failed' with the reason.
        const sid = await sendSmsViaProvider(item);
        if (sid === null) {
          // Provider misconfigured or failed — the helper already logged +
          // marked the row appropriately; do not re-mark here.
          continue;
        }
        await query(
          `UPDATE notification_sms_queue SET status = 'delivered', sent_at = NOW(), provider_message_id = $2 WHERE id = $1`,
          [item.id, sid],
        );
      }
    }

    await addAudit({
      action: "NOTIFICATION_DISPATCH_COMPLETED",
      userId: "system",
      userName: "Background Cron",
      role: "sysadmin",
      details: { message: "Notification dispatch cron completed", queues: results },
    });

    return NextResponse.json({ success: true, data: { dispatched: results } });
  } catch (err) {
    console.error("[cron/dispatch-notifications] failed:", err);
    return NextResponse.json(
      { success: false, error: { message: errMsg(err) || "Notification dispatch failed" } },
      { status: 500 },
    );
  }
}
