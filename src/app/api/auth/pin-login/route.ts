import { NextRequest, NextResponse } from "next/server";
import { verifyPin, findUserByLogin, createSession } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, pin } = body || {};

    if (!employeeId || !pin) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CREDENTIALS", message: "Employee ID and PIN are required" } },
        { status: 400 }
      );
    }

    const user = findUserByLogin(employeeId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!verifyPin(user.id, pin)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PIN", message: "Invalid PIN" } },
        { status: 401 }
      );
    }

    const token = await signToken(user);
    createSession(user.id, token, token + "-refresh");

    return NextResponse.json({
      success: true,
      data: {
        token,
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "PIN login failed" } },
      { status: 500 }
    );
  }
}
