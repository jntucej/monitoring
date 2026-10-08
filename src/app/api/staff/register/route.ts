import { NextRequest, NextResponse } from "next/server";
import { getStaffRegister, type RegisterKey } from "@/lib/staff-register";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

export const dynamic = "force-dynamic";

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const { searchParams } = new URL(req.url);
    const registerParam = searchParams.get("register")?.toUpperCase();
    const register: RegisterKey = registerParam === "B" ? "B" : "A";
    const date = searchParams.get("date") || undefined;

    const data = await getStaffRegister(register, date);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Staff register fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch staff register",
        },
      },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "hod", "operator", "supervisor"],
  }),
  { keyPrefix: "staff_register", maxRequests: 60 },
);

