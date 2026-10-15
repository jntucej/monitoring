import { NextRequest, NextResponse } from "next/server";
import { poolQuery } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/warden/hostel-scope
 *
 * Thin, read-only scope endpoint for the warden workspace: returns the
 * principal's authority surface so the UI can display scope in headers
 * ("within assigned hostel + delegated scope").
 *
 *   - warden_user: row from public.users (id, name, role, assigned_hostel,
 *     supervised_gates) — the accounts whose role is principal/deputy_warden.
 *   - active_delegations: rows from public.delegation_logs where
 *     delegate_role IN ('principal','deputy_warden','hostel_manager') and
 *     status = 'ACTIVE'.
 *
 * All values are derived server-side from the trusted auth context; no
 * cross-role data is exposed.
 */

interface WardenUserRow {
  id: string;
  name: string;
  role: string;
  assigned_hostel: string | null;
  supervised_gates: string[] | null;
}

interface DelegationRow {
  id: string;
  delegator_id: string;
  delegate_role: string;
  scope: string;
  expires_at: string;
  status: string;
  note: string | null;
  created_at: string;
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const { rows: wardenRows } = await poolQuery<WardenUserRow>(
    `SELECT id, name, role, assigned_hostel, supervised_gates
       FROM public.users
       WHERE role IN ('principal', 'deputy_warden')
        AND status = 'ACTIVE'
      LIMIT 25`
  );

  const { rows: delegations } = await poolQuery<DelegationRow>(
    `SELECT id, delegator_id, delegate_role, scope, expires_at, status, note, created_at
       FROM public.delegation_logs
       WHERE delegate_role IN ('principal', 'deputy_warden', 'hostel_manager')
        AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 25`
  );

  return NextResponse.json({
    success: true,
    data: {
      /** The requesting account, if it carries a warden-family role. */
      requestingUser: wardenRows.find((r) => r.id === auth.userId) ?? null,
      wardens: wardenRows,
      activeDelegations: delegations,
    },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: [
      "deputy_warden",
      "hostel_manager",
      "principal",
      "admin",
      "sysadmin",
    ],
  }),
  { keyPrefix: "warden_scope", maxRequests: 60 }
);
