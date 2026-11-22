// PR-12 — /api/principal/decisions (the decision ledger, PR-06)
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const READ_ROLES: Role[] = ["principal", "admin", "sysadmin"];

export interface DecisionView {
  id: string; decision_no: string; case_id: string; operation: string;
  actor_role: string; role_context: string; authority_source: string;
  reason: string; resulting_state: string | null; timestamp: string;
}

async function getDecisions(req: NextRequest, _ctx: { auth: AuthContext }) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  try {
    const { rows } = await query<DecisionView>(
      `SELECT id, decision_no, case_id, operation, actor_role, role_context,
              authority_source, reason, resulting_state, timestamp
         FROM public.decisions
        ORDER BY timestamp DESC
        LIMIT $1`,
      [limit],
    );
    return ok({ decisions: rows, total: rows.length });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load decisions", 500);
  }
}

export const GET = withAuthorization(getDecisions, { requiredRole: READ_ROLES });
