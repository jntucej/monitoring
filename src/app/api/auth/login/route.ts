import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, createSession } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password } = body || {};

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CREDENTIALS", message: "Login and password are required" } },
        { status: 400 }
      );
    }

    const user = verifyLogin(login, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Login failed" } },
      { status: 500 }
    );
  }
}