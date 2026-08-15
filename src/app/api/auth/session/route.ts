import { NextRequest, NextResponse } from "next/server";
import { getUserForSession } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "NO_TOKEN", message: "No authorization token provided" } },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
        { status: 401 }
      );
    }

    const user = getUserForSession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NO_SESSION", message: "No active session found" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          gateId: user.gateId,
          employeeId: user.employeeId,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Session validation failed" } },
      { status: 500 }
    );
  }
}
