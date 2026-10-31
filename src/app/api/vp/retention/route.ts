import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _context: { auth: AuthContext }) {
  const [recentRes] = await Promise.all([
    query<{
      ticket_number: string;
      status: string;
      updated_at: string;
      created_at: string;
      student_name: string | null;
      reason: string | null;
      workflow_type: string;
    }>(
      `SELECT p.ticket_number, p.status, p.updated_at, p.created_at,
              u.name AS student_name, p.reason, p.workflow_type
         FROM permissions p
         LEFT JOIN users u ON u.id = p.requester_user_id
        WHERE p.updated_at::date = CURRENT_DATE
          AND p.status IN ('APPROVED','REJECTED','ESCALATED')
          AND p.current_stage IN ('vice_principal','principal','completed')
        ORDER BY p.updated_at DESC
        LIMIT 20`
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const wins = recentRes.rows.map((r) => ({
    ticket: r.ticket_number,
    outcome: r.status,
    subject:
      r.student_name
        ? `${r.student_name} · ${r.reason ?? r.workflow_type}`
        : `${r.ticket_number} · ${r.workflow_type}`,
    at: r.updated_at,
    responseMs: new Date(r.updated_at).getTime() - new Date(r.created_at).getTime(),
  }));

  return ok({ todayWins: wins });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
