import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSecurityStats } from "@/lib/security";

/**
 * Role-scoped security posture preview for approver/branch dashboards.
 *
 * GET /api/admin/security/stats/preview
 *
 * The full admin endpoint (/api/admin/security/stats) stays restricted to
 * admin/sysadmin/warden/principal/operator/worker/supervisor. Approver
 * dashboards (VP, exam branch, OIE) only need the coarse anomaly counters,
 * so this preview exposes the same aggregated stats to the approver tier —
 * no audit-detail endpoints, no writes.
 */
async function handlePreviewGet() {
  try {
    const stats = await getSecurityStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load security stats";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handlePreviewGet, {
  requiredRole: [
    "admin",
    "sysadmin",
    "vice_principal",
    "exam_branch",
    "oie",
    "exam_superintendent",
    "principal",
    "hod",
    "faculty",
  ],
});
