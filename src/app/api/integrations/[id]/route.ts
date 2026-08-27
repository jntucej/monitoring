import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

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
      return NextResponse.json({ success: true, data: { id, ...updateData } });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin", "admin"] });

