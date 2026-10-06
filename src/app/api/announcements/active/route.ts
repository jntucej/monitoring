import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "student";
    const supabase = getSupabaseServiceClient();

    const { data: announcements, error: ancErr } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (ancErr || !announcements) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: dismissals } = await supabase
      .from("user_announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", actorId);

    const dismissedIds = new Set((dismissals || []).map((d) => d.announcement_id));

    const activeList = announcements.filter((a) => {
      if (dismissedIds.has(a.id)) return false;
      if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
      if (a.audience === "all" || a.audience === actorRole) return true;
      return false;
    });

    return NextResponse.json({ success: true, data: activeList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });

