import { type NextRequest } from "next/server";
import { ok, fail } from "@/server/http/response";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface StatusCountRow {
  status: string;
  count: number;
}

interface HostelTicketRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  priority: string;
  hostel_scope: string | null;
  created_at: string;
  updated_at: string;
  requester_user_id: string;
  requester_name: string | null;
  requester_unique_id: string | null;
}

async function handler(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [statusRes, ticketsRes] = await Promise.all([
      query<StatusCountRow>(
        `SELECT status, COUNT(*)::int AS count
           FROM public.permissions
          WHERE workflow_type = 'hostel'
          GROUP BY status
          ORDER BY status ASC`
      ),
      query<HostelTicketRow>(
        `SELECT
           p.id,
           p.ticket_number,
           p.workflow_type,
           p.current_stage,
           p.status,
           p.priority,
           p.hostel_scope,
           p.created_at,
           p.updated_at,
           p.requester_user_id,
           u.name AS requester_name,
           u.unique_id AS requester_unique_id
          FROM public.permissions p
          LEFT JOIN public.users u ON u.id = p.requester_user_id
         WHERE p.workflow_type = 'hostel'
         ORDER BY p.created_at DESC
         LIMIT 100`
      ),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRes.rows) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    }

    const tickets = ticketsRes.rows.map((row) => ({
      id: row.id,
      ticketNumber: row.ticket_number,
      ticket_number: row.ticket_number,
      workflowType: row.workflow_type,
      workflow_type: row.workflow_type,
      currentStage: row.current_stage,
      current_stage: row.current_stage,
      status: row.status,
      priority: row.priority,
      hostelScope: row.hostel_scope,
      hostel_scope: row.hostel_scope,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      requesterUserId: row.requester_user_id,
      requester_user_id: row.requester_user_id,
      requesterName: row.requester_name,
      requester_name: row.requester_name,
      requesterUniqueId: row.requester_unique_id,
      requester_unique_id: row.requester_unique_id,
    }));

    return ok({
      statusCounts: statusRes.rows,
      byStatus,
      total,
      tickets,
      items: tickets,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export const GET = withRateLimit(
  withAuthorization(handler, { requiredRole: ["sysadmin", "admin"] }),
  { windowMs: 60000, maxRequests: 60 }
);
