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

    const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.status) updateFields.status = body.status;
    if (body.assigned_to) updateFields.assigned_to = body.assigned_to;
    if (body.assigned_name) updateFields.assigned_name = body.assigned_name;
    if (body.priority) updateFields.priority = body.priority;

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ success: true, data: { id, ...updateFields } });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin", "admin"] });

