import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

export const GET = withAuthorization(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(phone_number) LIKE $${params.length} OR LOWER(message) LIKE $${params.length})`
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const listParams = [...params, limit, offset];
    const rows = await query(
      `SELECT id, phone_number, message, status, priority, attempts,
              template_code, cost_inr, created_at, sent_at, delivered_at,
              failed_at, provider_message_id, error
         FROM notification_sms_queue ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const countParams = params;
    const count = await query(
      `SELECT COUNT(*)::int AS n FROM notification_sms_queue ${whereSql}`,
      countParams
    );

    return ok({ rows: rows.rows, total: count.rows[0].n, page, limit });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
