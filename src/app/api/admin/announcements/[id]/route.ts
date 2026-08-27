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

    const updateFields: Record<string, any> = {};
    if (typeof body.is_published === "boolean") updateFields.is_published = body.is_published;
    if (body.title) updateFields.title = body.title;
    if (body.message) updateFields.message = body.message;
    if (body.priority) updateFields.priority = body.priority;
    if (body.audience) updateFields.audience = body.audience;

    const { data, error } = await supabase
      .from("announcements")
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

async function handleDelete(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();

    await supabase.from("announcements").delete().eq("id", id);
    return NextResponse.json({ success: true, data: { deletedId: id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin", "admin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin", "admin"] });

