import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Self-scoped visitor log access. /api/visitors is operator/admin-scoped and
 * lists every active pass; this thin endpoint returns only the calling
 * visitor's own visitor_logs rows so the visitor portal can render
 * registration, host info, approval status, visit details, check-in/out and
 * history without leaking other visitors' data.
 */
async function handleGet(req: NextRequest, { auth }: { auth: { userId: string } }) {
  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from("visitor_logs")
      .select("*, person:users!visitor_logs_user_id_fkey(*), host:users!visitor_logs_host_user_id_fkey(*)")
      .eq("user_id", auth.userId)
      .order("check_in_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    const logs = data ?? [];
    const active = logs.find((l: any) => l.status === "active" && !l.check_out_at) ?? null;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        active: active ? { status: "ACTIVE", log: active } : null,
        lastCompleted: logs.find((l: any) => l.status !== "active") ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching own visitor logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch visitor logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet as never, { requiredRole: ["visitor", "operator", "admin", "sysadmin"] }),
  { keyPrefix: "visitors_mine", maxRequests: 60 }
);
