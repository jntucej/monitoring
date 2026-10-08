import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filter = segments.filter((s) => s !== "comments");
  return decodeURIComponent(filter[filter.length - 1]);
}

async function handleGet(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();
    const actorRole = req.headers.get("x-user-role");

    let query = supabase
      .from("support_ticket_comments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (actorRole !== "admin" && actorRole !== "sysadmin") {
      query = query.eq("is_internal", false);
    }

    const { data: comments, error } = await query;

    if (error) return NextResponse.json({ success: true, data: [] });
    return NextResponse.json({ success: true, data: comments || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "user";
    const actorRole = req.headers.get("x-user-role") || "student";
    const { comment, isInternal = false } = await req.json();

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Comment content required" } }, { status: 400 });
    }

    const canPostInternal = actorRole === "admin" || actorRole === "sysadmin";
    const effectiveIsInternal = canPostInternal ? Boolean(isInternal) : false;

    const supabase = getSupabaseServiceClient();
    const { data: userProfile } = await supabase.from("users").select("name").eq("id", actorId).maybeSingle();
    const userName = userProfile?.name || actorId;

    const row = {
      id: `cm-` + Date.now(),
      ticket_id: id,
      user_id: actorId,
      user_name: userName,
      user_role: actorRole,
      comment: comment.trim(),
      is_internal: effectiveIsInternal,
      created_at: new Date().toISOString(),
    };

    await supabase.from("support_ticket_comments").insert(row);
    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });

