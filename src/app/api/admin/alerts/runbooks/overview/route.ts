// src/app/api/admin/alerts/runbooks/overview/route.ts
// GET /api/admin/alerts/runbooks/overview
// Runbooks audit log history: recent runbook executions from audit_logs.

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { QueryResultRow } from "pg";

interface RunbookAuditRow extends QueryResultRow {
  id: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  details: unknown;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  gate_id: string | null;
}

async function safeQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const res = await query<T>(text, params as never[]);
    return res.rows ?? [];
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42P01"
    ) {
      return [];
    }
    throw err;
  }
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      const rows = await safeQuery<RunbookAuditRow>(`
        SELECT
          id::text AS id,
          action,
          user_id::text AS user_id,
          user_name,
          user_role,
          details,
          ip_address,
          user_agent,
          timestamp::text AS timestamp,
          gate_id::text AS gate_id
        FROM audit_logs
        WHERE action LIKE 'RUNBOOK_%'
        ORDER BY timestamp DESC
        LIMIT 50
      `);

      return ok({
        items: rows,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "admin_alerts_runbooks_overview", windowMs: 60_000, maxRequests: 120 }
);
