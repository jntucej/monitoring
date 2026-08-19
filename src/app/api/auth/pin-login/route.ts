import { NextResponse } from "next/server";
import { verifyPin, findUserByLogin } from "@/lib/db";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, pin } = body || {};

    if (!employeeId || !pin) {
      return NextResponse.json(
        { success: false, error: { message: "Employee/User ID and PIN are required." } },
        { status: 400 }
      );
    }

    const cleanId = String(employeeId).trim();

    // 1. Attempt DB PIN verification if user exists
    try {
      const user = await findUserByLogin(cleanId);
      if (user) {
        const isValid = await verifyPin(user.id, String(pin));
        if (isValid) {
          return NextResponse.json({
            success: true,
            data: {
              token: `pin-token-${Date.now()}-${user.id}`,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                employeeId: user.employeeId,
                status: user.status,
              },
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB PIN login verification error:", dbErr);
    }

    // 2. If the database lookup failed or PIN invalid, return an error.
    // Do NOT fall back to role inference — that was a critical security hole
    // that allowed arbitrary PIN-based login with no valid credentials.
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PIN", message: "Invalid PIN or user not found." } },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("PIN Login API route error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error?.message || "Internal PIN authentication error" } },
      { status: 500 }
    );
  }
}
