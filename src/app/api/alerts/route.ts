import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/db";

export async function GET() {
  try {
    const data = getAlerts(true);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" } },
      { status: 500 }
    );
  }
}