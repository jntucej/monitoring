import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus/achievements
 *
 * The user's earned achievements (real rows from user_achievements,
 * joined to achievement_definitions) plus the currently available
 * catalog. Earned-only display — no public attendance rankings.
 */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const { data: defs, error: defErr } = await supabase
    .from("achievement_definitions")
    .select("code, title, description, icon, tier")
    .eq("enabled", true);
  if (defErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: defErr.message } }, { status: 500 });
  }

  const { data: earnedRows, error: earnedErr } = await supabase
    .from("user_achievements")
    .select("achievement_code, earned_at")
    .eq("user_id", userId);
  if (earnedErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: earnedErr.message } }, { status: 500 });
  }

  const earnedByCode = new Map<string, string>();
  for (const row of earnedRows || []) {
    earnedByCode.set(row.achievement_code, row.earned_at);
  }

  const earned = (defs || [])
    .filter((d) => earnedByCode.has(d.code))
    .map((d) => ({
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      tier: d.tier,
      earnedAt: earnedByCode.get(d.code)!,
    }));

  const available = (defs || []).map((d) => ({
    code: d.code,
    title: d.title,
    description: d.description,
    icon: d.icon,
    tier: d.tier,
    earned: earnedByCode.has(d.code),
  }));

  return NextResponse.json({
    success: true,
    data: { earned, available },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_achievements",
  maxRequests: 60,
});
