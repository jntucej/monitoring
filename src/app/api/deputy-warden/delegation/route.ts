import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/deputy-warden/delegation
 *
 * Reports whether the signed-in deputy warden currently holds a recorded
 * delegation (or standing policy scope) from the principal/warden. The
 * policy ledger has no per-user delegation table yet, so the endpoint
 * returns a stable shape:
 *
 *   { success: true, data: { active, scopes, note } }
 *
 * - active=false while no delegation rows exist (UI shows read-only badge);
 * - scopes lists the workflow types a delegation would cover.
 *
 * Only the deputy_warden role (plus admins for oversight) can read it.
 */

const READ_ROLES = new Set(["deputy_warden", "admin", "sysadmin"]);

const FALLBACK_SCOPES = ["hostel", "outpass", "staff_leave"];

async function handleGet(
  _req: NextRequest,
  context: { auth: AuthContext }
) {
  const role = context.auth.role;
  if (!READ_ROLES.has(role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
      { status: 403 }
    );
  }

  // No recorded delegation ledger yet — surface a stable read-only state so
  // the UI badge can render deterministically. When a delegations table is
  // introduced, resolve rows for the acting user here instead.
  return NextResponse.json({
    success: true,
    data: {
      active: false,
      scopes: FALLBACK_SCOPES,
      note: "No recorded delegation from the principal. Review actions are read-only and escalated to the principal stage.",
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "deputy_warden_delegation",
  maxRequests: 60,
});
