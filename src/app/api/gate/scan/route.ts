import { NextRequest, NextResponse } from "next/server";
import { addScan, findStudentByRoll, inferDirection, statsToday, findAllGates } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roll, direction, reason, gateId, operatorId, isManual } = body;

    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_STUDENT", message: "Student roll number is required" } },
        { status: 400 }
      );
    }

    const student = findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STUDENT", message: "Student not found", details: { roll } } },
        { status: 404 }
      );
    }

    if (!direction) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DIRECTION", message: "Direction must be IN or OUT" } },
        { status: 400 }
      );
    }

    if (direction === "OUT" && !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_REASON", message: "Reason is required for OUT scans" } },
        { status: 400 }
      );
    }

    const result = addScan({
      roll,
      direction,
      reason,
      gateId: gateId || "gate-1",
      operatorId: operatorId || "op-1",
      isManual: isManual || false,
    });

    if (result.duplicate) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_SCAN", message: "This student was already scanned recently. Please wait 5 minutes." } },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, data: result.scan });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to record scan" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = statsToday();
    // Add stats for inference
    const gates = findAllGates();
    return NextResponse.json({ success: true, data: { ...stats, gates } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load scan stats" } },
      { status: 500 }
    );
  }
}