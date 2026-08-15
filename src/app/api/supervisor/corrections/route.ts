import { NextRequest, NextResponse } from "next/server";
import { correctionCandidates, correctScan, getAllGatesLive } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const action = params.get("action");

    if (action === "live") {
      const gates = getAllGatesLive();
      return NextResponse.json({ success: true, data: gates });
    }

    const candidates = correctionCandidates();
    return NextResponse.json({ success: true, data: candidates });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load data" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logId, newDirection, newReason, reason, userId, userName, role } = body;

    if (!logId || !newDirection || !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "logId, newDirection, and reason are required" } },
        { status: 400 }
      );
    }

    const corrected = correctScan(logId, newDirection, newReason, reason, userId || "sv-1", userName || "Supervisor", role || "supervisor");
    if (!corrected) {
      return NextResponse.json(
        { success: false, error: { code: "CORRECTION_FAILED", message: "Could not correct scan (may be outside window)" } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: corrected });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Correction failed" } },
      { status: 500 }
    );
  }
}
