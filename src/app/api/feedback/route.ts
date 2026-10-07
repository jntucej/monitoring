import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db";

let feedbackStore: Array<{
  id: string;
  theme: string;
  comment: string;
  userAgent: string;
  timestamp: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { theme, comment } = body;
    if (!theme || !comment) {
      return NextResponse.json(
        { success: false, error: "Missing theme or comment" },
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
    if (feedbackStore.length > 1000) feedbackStore.length = 1000;

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
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
