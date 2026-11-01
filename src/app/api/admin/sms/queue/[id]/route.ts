import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 1] ?? "");
}

export const GET = withAuthorization(
  async (req: NextRequest) => {
    const id = getId(req);
    const { rows } = await query(
      `SELECT id, phone_number, message, status, priority, attempts,
              template_code, sender_id, dlt_template_id,
              cost_inr, created_at, sent_at, delivered_at, failed_at,
              provider_message_id, error, tracking_id
         FROM notification_sms_queue WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return fail("NOT_FOUND", "SMS queue row not found", 404);
    return ok(rows[0]);
  },
  { requiredRole: ["admin", "sysadmin"] }
);

export const DELETE = withMutationGuard(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const id = getId(req);
    const { rows } = await query<{ status: string }>(
      `UPDATE notification_sms_queue
          SET status = 'dead_letter', failed_at = NOW(),
              error = 'Manually cancelled by admin'
        WHERE id = $1
        RETURNING status`,
      [id]
    );
    if (!rows[0]) return fail("NOT_FOUND", "SMS queue row not found", 404);
    await addAudit({
      action: "SMS_QUEUE_CANCELLED",
      userId: auth.userId,
      role: auth.role,
      details: { queueId: id },
    });
    return ok({ cancelled: id });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
