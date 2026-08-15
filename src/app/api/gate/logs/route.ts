import { NextRequest, NextResponse } from "next/server";
import { getAllLogs, correctionCandidates } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const gateId = params.get("gateId") || undefined;
    const date = params.get("date") || undefined;
    const direction = params.get("direction") || undefined;
    const reason = params.get("reason") || undefined;
    const search = params.get("search") || undefined;
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "50");

    const data = getAllLogs({ gateId, date, direction, reason, search, page, limit });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load logs" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scans } = body;

    if (!Array.isArray(scans)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "Expected scans array" } },
        { status: 400 }
      );
    }

    const { addScan } = await import("@/lib/db");
    const results = [];
    for (const scan of scans) {
      try {
        const result = addScan({
          roll: scan.roll,
          direction: scan.direction,
          reason: scan.reason,
          gateId: scan.gateId,
          operatorId: scan.operatorId,
          isManual: scan.isManual,
        });
        results.push({ local_id: scan.id, status: "success", data: result.scan });
      } catch {
        results.push({ local_id: scan.id, status: "error" });
      }
    }

    return NextResponse.json({ success: true, data: { results } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Bulk sync failed" } },
      { status: 500 }
    );
  }
}