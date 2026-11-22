// PR-12 — /api/principal/escalations (GET open escalations, PR-05)
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const READ_ROLES: Role[] = ["principal", "admin", "sysadmin"];

export interface EscalationView {
  id: string; case_id: string; reason: string; severity: string;
  source: string | null; target_role: string | null; target_context: string | null;
  status: string; recommended_action: string | null; created_at: string;
}

async function getEscalations(req: NextRequest, _ctx: { auth: AuthContext }) {
  const onlyOpen = req.nextUrl.searchParams.get("open") !== "false";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  try {
    const { rows } = await query<EscalationView>(
      `SELECT id, case_id, reason, severity, source, target_role, target_context,
              status, recommended_action, created_at
         FROM public.escalations
        ${onlyOpen ? "WHERE status = 'OPEN'" : ""}
        ORDER BY
          CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT $1`,
      [limit],
    );
    return ok({ escalations: rows, total: rows.length });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load escalations", 500);
  }
}

export const GET = withAuthorization(getEscalations, { requiredRole: READ_ROLES });
