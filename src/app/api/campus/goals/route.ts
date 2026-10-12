import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

function mapGoal(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    targetValue: r.target_value as number,
    currentValue: r.current_value as number,
    isCompleted: r.is_completed as boolean,
    completedAt: (r.completed_at as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

/**
 * GET /api/campus/goals — the user's own personal goals + progress.
 */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();

  const { data: rows, error } = await supabase
    .from("personal_goals")
    .select("id, title, target_value, current_value, is_completed, completed_at, notes, created_at")
    .eq("user_id", context.auth.userId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }

  const goals = (rows || []).map(mapGoal);
  return NextResponse.json({
    success: true,
    data: {
      goals,
      total: goals.length,
      completed: goals.filter((g) => g.isCompleted).length,
    },
  });
}

/**
 * POST /api/campus/goals — create a new personal goal.
 * Goals are user-defined, separate from academic evaluation.
 */
async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const supabase = getSupabaseServiceClient();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title || title.length > 200) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "title (1-200 chars) is required" } }, { status: 400 });
  }

  let targetValue = parseInt(String(body.targetValue ?? body.target_value ?? "1"), 10);
  if (Number.isNaN(targetValue) || targetValue < 1) targetValue = 1;
  if (targetValue > 100000) targetValue = 100000;

  const notes = body.notes != null ? String(body.notes).slice(0, 1000) : null;

  const { data: inserted, error: insErr } = await supabase
    .from("personal_goals")
    .insert({
      user_id: context.auth.userId,
      title,
      target_value: targetValue,
      current_value: 0,
      notes,
    })
    .select()
    .single();
  if (insErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: insErr.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { goal: mapGoal(inserted) },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), { keyPrefix: "campus_goals_get", maxRequests: 60 });
export const POST = withRateLimit(withAuthorization(handlePost), { keyPrefix: "campus_goals_post", maxRequests: 20 });
