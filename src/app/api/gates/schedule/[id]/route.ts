import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePut(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    const updateFields: Record<string, any> = {};
    if (typeof body.is_active === "boolean") updateFields.is_active = body.is_active;
    if (body.rule_name) updateFields.rule_name = body.rule_name;
    if (body.start_time) updateFields.start_time = body.start_time;
    if (body.end_time) updateFields.end_time = body.end_time;
    if (body.action) updateFields.action = body.action;

    const { data } = await supabase.from("gate_access_rules").update(updateFields).eq("id", id).select("*").single();

    return NextResponse.json({ success: true, data: data || { id, ...updateFields } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();

    await supabase.from("gate_access_rules").delete().eq("id", id);
    await supabase.from("gate_holidays").delete().eq("id", id);
    return NextResponse.json({ success: true, data: { deletedId: id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const PUT = withAuthorization(handlePut, { requiredRole: ["sysadmin", "admin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin", "admin"] });

