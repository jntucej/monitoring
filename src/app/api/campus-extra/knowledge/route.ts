import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { ROLES } from "@/lib/roles";

/**
 * GET /api/campus-extra/knowledge?category=hostel&search=exam
 * POST /api/campus-extra/knowledge?doc_id=<id>&reason=<text>
 *
 * Searchable, categorized knowledge centre for approved institutional
 * information. Read-only for most roles; publishing restricted to authorized
 * roles. The report-outdated POST is available to any authenticated user.
 */

const PUBLISH_ROLES: string[] = [ROLES.ADMIN, ROLES.SYSADMIN, ROLES.PRINCIPAL, ROLES.VICE_PRINCIPAL];

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const role = context.auth.role;

  const category = req.nextUrl.searchParams.get("category");
  const search = req.nextUrl.searchParams.get("search")?.trim();

  let query = supabase
    .from("campus_knowledge_docs")
    .select("id, category, title, body, owner_role, updated_at, version")
    .eq("is_published", true);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
  }

  const { data: docRows, error: docErr } = await query
    .order("updated_at", { ascending: false })
    .limit(100);
  if (docErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: docErr.message } },
      { status: 500 }
    );
  }

  // Distinct categories
  const { data: catRows, error: catErr } = await supabase
    .from("campus_knowledge_docs")
    .select("category")
    .eq("is_published", true)
    .limit(50);
  if (catErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: catErr.message } },
      { status: 500 }
    );
  }

  const categories = Array.from(new Set((catRows || []).map((r: any) => r.category).filter(Boolean))) as string[];

  const docs = (docRows || []).map((d: any) => ({
    id: d.id,
    category: d.category,
    title: d.title,
    body: d.body,
    ownerRole: d.owner_role,
    updatedAt: d.updated_at,
    version: d.version,
  }));

  return NextResponse.json({
    success: true,
    data: { docs, categories },
  });
}

async function handlePost(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;

  const docId = req.nextUrl.searchParams.get("doc_id");
  const reason = req.nextUrl.searchParams.get("reason")?.slice(0, 500) || "";

  if (!docId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing doc_id" } },
      { status: 400 }
    );
  }

  // Only authorized roles can publish/update; any authenticated user can report outdated
  const canPublish = PUBLISH_ROLES.includes(role);

  if (canPublish) {
    // Fetch the doc to bump version
    const { data: doc, error: findErr } = await supabase
      .from("campus_knowledge_docs")
      .select("id, version")
      .eq("id", docId)
      .maybeSingle();
    if (findErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: findErr.message } },
        { status: 500 }
      );
    }

    const { error: upErr } = await supabase
      .from("campus_knowledge_docs")
      .update({
        updated_at: new Date().toISOString(),
        version: (doc?.version ?? 0) + 1,
      })
      .eq("id", docId);
    if (upErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: upErr.message } },
        { status: 500 }
      );
    }
  } else {
    // For non-privileged roles, log the report as a feedback report
    const { error: insErr } = await supabase
      .from("campus_feedback_reports")
      .insert({
        status: "submitted",
        category: "knowledge_outdated",
        subject: `Outdated knowledge document: ${docId}`,
        description: reason || "Reported as outdated",
        submitted_by: userId,
        notes: null,
        reviewer_note: null,
        resolved_at: null,
      });
    if (insErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insErr.message } },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_knowledge",
  maxRequests: 60,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "campus_extra_knowledge",
  maxRequests: 20,
});
