import { NextRequest } from "next/server";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * MSG91 delivery receipt webhook.
 *
 * Configure in the MSG91 dashboard → Settings → Webhooks:
 *   URL    = https://monitor.ucej.in/api/webhooks/sms
 *   Secret = MSG91_WEBHOOK_SECRET (sent as the 'X-MSG91-Secret' header)
 *
 * MSG91 sends events: sent, delivered, failed, dnd, expired.
 * We update the queue row keyed by provider_message_id (= MSG91 requestId).
 */
const SECRET = process.env.MSG91_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) return fail("NO_WEBHOOK_SECRET", "MSG91_WEBHOOK_SECRET unset", 500);
  const provided = req.headers.get("x-msg91-secret");
  if (provided !== SECRET) return fail("INVALID_SECRET", "Secret mismatch", 401);

  const event = (await req.json().catch(() => ({}))) as {
    requestId?: string;
    eventName?: string;
    status?: string;
  };
  const requestId = event.requestId;
  if (!requestId) return ok({ skipped: true });

  const status = (event.eventName ?? event.status ?? "").toLowerCase();

  switch (status) {
    case "delivered":
      await query(
        `UPDATE notification_sms_queue
            SET status = 'delivered', delivered_at = NOW()
          WHERE provider_message_id = $1`,
        [requestId]
      );
      break;
    case "sent":
      // 'sent' is an intermediate state; the row is already 'sent' from the
      // worker's markSent() call. No-op here.
      break;
    case "failed":
    case "expired":
    case "dnd":
      await query(
        `UPDATE notification_sms_queue
            SET status = 'failed', failed_at = NOW(), error = $2
          WHERE provider_message_id = $1`,
        [requestId, status]
      );
      break;
  }

  return ok({ ok: true });
}
