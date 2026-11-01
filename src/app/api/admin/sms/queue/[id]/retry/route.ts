import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const POST = withMutationGuard(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const segs = new URL(req.url).pathname.split("/").filter(Boolean);
    const id = decodeURIComponent(segs[segs.length - 2] ?? "");
    const { rows } = await query<{ status: string }>(
      `SELECT status FROM notification_sms_queue WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return fail("NOT_FOUND", "SMS queue row not found", 404);
    const current = rows[0].status;
    if (current !== "failed" && current !== "dead_letter") {
      return fail(
        "BAD_STATE",
        `Row is '${current}' — only failed or dead_letter rows can be retried`,
        400
      );
    }
    await query(
      `UPDATE notification_sms_queue
          SET status = 'pending', attempts = 0, next_attempt_at = NOW(),
              error = NULL, processing_started_at = NULL
        WHERE id = $1`,
      [id]
    );
    await addAudit({
      action: "SMS_QUEUE_RETRIED",
      userId: auth.userId,
      role: auth.role,
      details: { queueId: id, previousStatus: current },
    });
    return ok({ retried: id });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
