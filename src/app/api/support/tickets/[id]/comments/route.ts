import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
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
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
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

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.support_ticket_comments
           (id, ticket_id, user_id, user_name, user_role, comment, is_internal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, id, actorId, userName, actorRole, comment.trim(), effectiveIsInternal]
      );
      await client.query(
        "UPDATE public.support_tickets SET updated_at = NOW() WHERE id = $1", [id]
      );
    });

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "principal", "staff"] });
export const POST = withMutationGuard(handlePost, {requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "principal", "staff"]});
