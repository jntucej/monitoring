import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2]);
}

async function handleGet(req: NextRequest) {
  try {
    const ticketId = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();

    const { data: comments, error } = await supabase
      .from("support_ticket_comments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: comments || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const ticketId = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const body = await req.json().catch(() => ({}));
    const { comment, authorName } = body;

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Comment cannot be empty" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const commentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const commentRow = {
      id: commentId,
      ticket_id: ticketId,
      author_id: actorId,
      author_name: authorName || "Support Agent",
      comment: comment.trim(),
      created_at: timestamp,
    };

    const { data, error } = await supabase
      .from("support_ticket_comments")
      .insert(commentRow)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: true, data: commentRow });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "ticket_comments_get", maxRequests: 60 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "ticket_comments_post", maxRequests: 30 }
);
