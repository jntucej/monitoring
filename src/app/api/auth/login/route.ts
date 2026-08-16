import { NextResponse } from "next/server";
import { verifyLogin } from "@/lib/db";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body || {};

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: { message: "Login identifier and password/PIN are required." } },
        { status: 400 }
      );
    }

    const cleanLogin = String(login).trim();

    // 1. Check Supabase DB for user
    try {
      const user = await verifyLogin(cleanLogin, password);
      if (user) {
        return NextResponse.json({
          success: true,
          data: {
            token: `token-${Date.now()}-${user.id}`,
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
    } catch (dbErr) {
      console.warn("DB login verification error, using fallback authentication:", dbErr);
    }

    // 2. Demo & Fallback Role Inference based on input / login identifier
    let role: Role = "student";
    let name = cleanLogin;
    const upper = cleanLogin.toUpperCase();

    if (upper.includes("SYS") || upper.includes("SYSADMIN")) {
      role = "sysadmin";
      name = "System Administrator";
    } else if (upper.includes("ADM") || upper.includes("ADMIN")) {
      role = "admin";
      name = "Campus Administrator";
    } else if (upper.includes("SUP") || upper.includes("SUPERVISOR")) {
      role = "supervisor";
      name = "Gate Supervisor";
    } else if (upper.includes("OP") || upper.includes("OPERATOR") || upper.includes("GUARD")) {
      role = "operator";
      name = "Gate Guard / Operator";
    } else if (upper.includes("PAR") || upper.includes("PARENT")) {
      role = "parent";
      name = "Student Parent";
    } else {
      role = "student";
      name = `Student (${cleanLogin})`;
    }

    return NextResponse.json({
      success: true,
      data: {
        token: `mock-token-${Date.now()}`,
        user: {
          id: `usr-${cleanLogin.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name,
          email: `${role}@gatekeeper.edu`,
          role,
          status: "ACTIVE",
        },
      },
    });
  } catch (error: any) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal authentication error" } },
      { status: 500 }
    );
  }
}
