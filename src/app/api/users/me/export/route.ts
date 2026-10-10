import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

async function handleExport(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  try {
    const userId = auth.userId;
    const supabase = getSupabaseServiceClient();

    const [resUser, resLogs, resPasses] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, phone, role, status, unique_id, department_id, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("movement_logs").select("*").eq("user_id", userId),
      supabase.from("gate_passes").select("*").eq("user_id", userId),
    ]);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      userProfile: resUser.data || { id: userId, role: auth.role },
      movementLogs: resLogs.data || [],
      passes: resPasses.data || [],
    };

    return NextResponse.json({
      success: true,
      data: exportBundle,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to export data." } },
      { status: 500 }
    );
  }
}

const rateLimitedExport = withRateLimit(handleExport, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "user_dsar_export",
});

export const GET = withAuthorization(rateLimitedExport);
export const POST = withAuthorization(rateLimitedExport);
