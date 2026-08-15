import { NextResponse } from "next/server";
import { dashboard } from "@/lib/db";

export async function GET() {
  try {
    const data = dashboard();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load dashboard" } },
      { status: 500 }
    );
  }
}