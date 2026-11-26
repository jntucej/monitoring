import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { dashboard } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(_req: NextRequest) {
  try {
    const data = await dashboard();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard stats' } },
      { status: 500 }
    );
  }
}

export const GET = withApiChain(handleGet, {
  route: "/api/admin/dashboard",
  auth: "user",
  requiredRole: ['admin', 'sysadmin'],
  rateLimit: { keyPrefix: 'admin_dashboard', maxRequests: 60 },
});