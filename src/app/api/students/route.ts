import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, findStudentByRoll } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const roll = params.get("roll");
    const q = params.get("q");

    if (roll) {
      const student = findStudentByRoll(roll);
      if (!student) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: student });
    }

    if (q) {
      return NextResponse.json({ success: true, data: searchStudents(q) });
    }

    return NextResponse.json({ success: true, data: findAllStudents() });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load students" } },
      { status: 500 }
    );
  }
}