import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handlePost(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const supabase = getSupabaseServiceClient();

    const [resUser, resLogs, resPasses] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("movement_logs").select("*").eq("user_id", userId),
      supabase.from("passes").select("*").eq("user_id", userId),
    ]);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      userProfile: resUser.data || { id: userId, name: "Exported User" },
      movementLogs: resLogs.data || [],
      passes: resPasses.data || [],
    };

    return NextResponse.json({
      success: true,
      data: {
        userId,
        json: JSON.stringify(exportBundle, null, 2),
        exportBundle,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });

