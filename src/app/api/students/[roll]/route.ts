import { NextRequest, NextResponse } from "next/server";
import { findStudentByRoll, getStudentHistory, getStudentStatus } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const roll = params.get("roll");

    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_ROLL", message: "Student roll number is required" } },
        { status: 400 }
      );
    }

    const student = findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } },
        { status: 404 }
      );
    }

    const status = getStudentStatus(roll);
    const history = getStudentHistory(roll, 20);

    return NextResponse.json({
      success: true,
      data: {
        student,
        campusStatus: status.status,
        lastScan: status.lastScan,
        history,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student data" } },
      { status: 500 }
    );
  }
}
