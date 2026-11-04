
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

export const GET = withAuthorization(
  async () => {
    const { rows } = await query<{
      status: string;
      n: number;
    }>(
      `SELECT status, COUNT(*)::int AS n FROM notification_sms_queue
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY status`
    );
    const map = Object.fromEntries(rows.map((r) => [r.status, r.n]));
    const cost = (
      await query<{ total: string }>(
        `SELECT COALESCE(SUM(cost_inr),0)::text AS total
           FROM notification_sms_queue
          WHERE sent_at > NOW() - INTERVAL '24 hours'`
      )
    ).rows[0].total;

    return ok({
      queued: map.pending ?? 0,
      processing: map.processing ?? 0,
      sent: map.sent ?? 0,
      delivered: map.delivered ?? 0,
      failed: map.failed ?? 0,
      dead_letter: map.dead_letter ?? 0,
      cost_24h_inr: parseFloat(cost),
    });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
