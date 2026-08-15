import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const recipientType = params.get("type") || "parent";
    const recipientId = params.get("id") || "pa-1";

    const data = getNotifications(recipientType, recipientId);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load notifications" } },
      { status: 500 }
    );
  }
}