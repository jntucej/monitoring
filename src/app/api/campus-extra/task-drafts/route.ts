import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus-extra/task-drafts
 * POST /api/campus-extra/task-drafts
 * DELETE /api/campus-extra/task-drafts?draft_id=<id>
 *
 * Save and resume in-progress tasks: unfinished request drafts, incomplete
 * event registrations, long approval-queue position, previously-opened
 * incidents, draft announcements, restored search filters.
 *
 * Persists locally via taskDraftStore (zustand) AND mirrors to this endpoint
 * when authenticated.
 */

const VALID_TASK_TYPES = new Set([
  "request_draft",
  "event_registration",
  "approval_queue",
  "incident",
  "draft_announcement",
  "search_filters",
]);

async function handleGet(
  _req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const { data: rows, error: err } = await supabase
    .from("user_task_drafts")
    .select("id, task_type, payload, position, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (err) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }

  const drafts = (rows || []).map((r: any) => ({
    id: r.id,
    taskType: r.task_type,
    payload: r.payload,
    position: r.position,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({
    success: true,
    data: { drafts },
  });
}

async function handlePost(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const taskType = String(body.taskType || "").slice(0, 50);
  const payload = (typeof body.payload === "object" && body.payload !== null ? body.payload : {}) as Record<string, unknown>;
  const position = Math.max(0, Math.min(100, Number(body.position ?? 0)));

  if (!taskType || !VALID_TASK_TYPES.has(taskType)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: `taskType must be one of: ${Array.from(VALID_TASK_TYPES).join(", ")}`,
        },
      },
      { status: 400 }
    );
  }

  // Upsert: if a draft with same user+type+position exists, update it
  const { data: existing, error: findErr } = await supabase
    .from("user_task_drafts")
    .select("id")
    .eq("user_id", userId)
    .eq("task_type", taskType)
    .eq("position", position)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: findErr.message } },
      { status: 500 }
    );
  }

  let draftId: string;

  if (existing) {
    const { error: upErr } = await supabase
      .from("user_task_drafts")
      .update({ payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (upErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: upErr.message } },
        { status: 500 }
      );
    }
    draftId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("user_task_drafts")
      .insert({
        user_id: userId,
        task_type: taskType,
        payload,
        position,
      })
      .select("id")
      .single();
    if (insErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insErr.message } },
        { status: 500 }
      );
    }
    draftId = inserted.id;
  }

  return NextResponse.json({
    success: true,
    data: {
      id: draftId,
      taskType,
      payload,
      position,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function handleDelete(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const draftId = req.nextUrl.searchParams.get("draft_id");

  if (!draftId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing draft_id" } },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabase
    .from("user_task_drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId);

  if (delErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: delErr.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_task_drafts",
  maxRequests: 60,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "campus_extra_task_drafts",
  maxRequests: 30,
});

export const DELETE = withRateLimit(withAuthorization(handleDelete), {
  keyPrefix: "campus_extra_task_drafts",
  maxRequests: 30,
});
