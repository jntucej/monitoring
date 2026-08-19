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
      console.warn("DB login verification error:", dbErr);
    }

    if (process.env.NODE_ENV === 'development') {
      // In development, only allow specific test credentials
      const validTestUsers: Record<string, { password: string; role: Role; name: string }> = {
        'test-operator': { password: 'op123', role: 'operator', name: 'Test Operator' },
        'test-admin': { password: 'admin123', role: 'admin', name: 'Test Admin' },
        'test-student': { password: 'stu123', role: 'student', name: 'Test Student' },
        'test-supervisor': { password: 'sup123', role: 'supervisor', name: 'Test Supervisor' },
        'test-faculty': { password: 'fac123', role: 'faculty', name: 'Test Faculty' },
        'test-staff': { password: 'stf123', role: 'staff', name: 'Test Staff' },
        'test-worker': { password: 'wrk123', role: 'worker', name: 'Test Worker' },
        'test-visitor': { password: 'vis123', role: 'visitor', name: 'Test Visitor' },
        'test-parent': { password: 'par123', role: 'parent', name: 'Test Parent' },
        'test-sysadmin': { password: 'sys123', role: 'sysadmin', name: 'Test SysAdmin' },
      };

      const testUser = validTestUsers[cleanLogin];
      if (testUser && password === testUser.password) {
        return NextResponse.json({
          success: true,
          data: {
            token: `dev-token-${Date.now()}`,
            user: {
              id: `dev-${testUser.role}-${Date.now()}`,
              name: testUser.name,
              email: `${testUser.role}@test.dev`,
              role: testUser.role,
              status: 'ACTIVE',
            },
          },
        });
      }
    }

    // Return unauthorized if verification failed
    return NextResponse.json(
      { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials or user not found." } },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error?.message || "Internal authentication error" } },
      { status: 500 }
    );
  }
}
