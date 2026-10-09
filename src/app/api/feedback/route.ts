import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertLength, LIMITS } from "@/lib/validation";

const feedbackStore: Array<{
  id: string;
  theme: string;
  comment: string;
  userAgent: string;
  timestamp: string;
}> = [];

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    let theme: string;
    let comment: string;
    try {
      theme = assertLength(body?.theme, LIMITS.FEEDBACK_THEME, "theme");
      comment = assertLength(body?.comment, LIMITS.FEEDBACK_COMMENT, "comment");
    } catch (valErr: any) {
      return NextResponse.json(
        { success: false, error: valErr.message || "Missing or invalid theme or comment" },
        { status: 400 }
      );
    }
    const feedback = {
      id: `fb-${Date.now()}`,
      theme,
      comment,
      userAgent: req.headers.get("user-agent") || "unknown",
      timestamp: new Date().toISOString(),
    };

    try {
      await getDbClient().from("feedback").insert([
        {
          theme,
          comment,
          user_agent: feedback.userAgent,
          created_at: feedback.timestamp,
        },
      ]);
    } catch (e) {
      console.warn("Supabase feedback insert fallback:", e);
    }

    feedbackStore.unshift(feedback);
    if (feedbackStore.length > 50) feedbackStore.length = 50;

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

async function handleGet(req: NextRequest) {
  try {
    const { data, error } = await getDbClient().from("feedback").select("*").order("created_at", { ascending: false }).limit(100);
    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, data });
    }
  } catch (e) {
    // fallback
  }
  return NextResponse.json({ success: true, data: feedbackStore });
}

export const POST = withRateLimit(handlePost, { keyPrefix: "feedback_post", maxRequests: 10, windowMs: 60 * 1000 });
export const GET = withRateLimit(withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }), { keyPrefix: "feedback_get", maxRequests: 30 });
