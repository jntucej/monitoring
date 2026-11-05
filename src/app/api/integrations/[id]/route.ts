import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePatch(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.enabled === "boolean") updateData.enabled = body.enabled;
    if (body.name) updateData.name = body.name;
    if (body.config) updateData.config = body.config;
    if (body.status) updateData.status = body.status;

    const { data, error } = await supabase
      .from("integration_configs")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Integration config update failed:", error);
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_FAILED", message: errMsg(error) } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const PATCH = withMutationGuard(handlePatch, {requiredRole: ["sysadmin", "admin"]});
