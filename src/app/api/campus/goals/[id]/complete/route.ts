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
 * POST /api/campus/goals/[id]/complete
 *
 * Marks the user's own goal as completed. Ownership is enforced:
 * only the goal's creator can complete it. Idempotent: completing an
 * already-completed goal returns the current state.
 */
async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const goalId = decodeURIComponent(segments[segments.length - 2]);
  if (!goalId) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid goal id" } }, { status: 400 });
  }

  const { data: goal, error: fetchErr } = await supabase
    .from("personal_goals")
    .select("id, user_id, title, target_value, current_value, is_completed, completed_at, notes, created_at")
    .eq("id", goalId)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: fetchErr.message } }, { status: 500 });
  }
  if (!goal || goal.user_id !== userId) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Goal not found" } }, { status: 404 });
  }

  if (goal.is_completed) {
    const { data: all, error: listErr } = await supabase
      .from("personal_goals")
      .select("id")
      .eq("user_id", userId);
    if (listErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: listErr.message } }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      data: { goal: mapGoal(goal), progress: { total: (all || []).length, completed: (all || []).length } },
    });
  }

  const { data: updated, error: upErr } = await supabase
    .from("personal_goals")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      current_value: goal.target_value,
    })
    .eq("id", goalId)
    .select()
    .single();
  if (upErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: upErr.message } }, { status: 500 });
  }

  const { data: all, error: listErr } = await supabase
    .from("personal_goals")
    .select("id, is_completed")
    .eq("user_id", userId);
  if (listErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: listErr.message } }, { status: 500 });
  }
  const completed = (all || []).filter((g) => g.is_completed).length;

  return NextResponse.json({
    success: true,
    data: {
      goal: mapGoal(updated),
      progress: { total: (all || []).length, completed },
    },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), { keyPrefix: "campus_goal_complete", maxRequests: 30 });
