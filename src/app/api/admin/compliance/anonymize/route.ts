import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";

async function handlePost(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "User ID required" } }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const hash = randomBytes(4).toString("hex");

    await supabase.rpc("anonymize_user", { p_user_id: userId, p_hash: hash, p_actor_id: actorId });

    return NextResponse.json({ success: true, data: { userId, anonymized: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });

