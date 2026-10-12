import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getActiveLockdown, createLockdown, liftLockdown } from "@/lib/db";

/**
 * Role-scoped lockdown mirror for operator / supervisor / gate desks.
 *
 * The authoritative /api/admin/lockdown endpoint (raise/lift + audit) stays
 * admin/warden/principal/supervisor-scoped on the admin side. Gate desks and
 * the warden desk need to READ the active lockdown state without touching the
 * /api/admin/* paths — so this mirrors the same read surface for the
 * operator/operator-adjacent tiers.
 *
 * GET /api/lockdown/active — any authenticated caller (read-only mirror of
 *     getActiveLockdown; identical { success, data } envelope).
 */
async function handleGet() {
  try {
    const lockdown = await getActiveLockdown();
    return NextResponse.json({ success: true, data: lockdown });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to read lockdown state";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet); // SELF — any authenticated caller

// Re-exported so this module is the single import site for lockdown helpers in
// non-admin desks (supervisor/gate pages still import via /api/lockdown/active).
export { createLockdown, liftLockdown };
