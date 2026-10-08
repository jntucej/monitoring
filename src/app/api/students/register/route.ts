import { NextRequest, NextResponse } from "next/server";
import { getStudentRegister } from "@/lib/student-register";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { ReasonCode } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";

export const dynamic = "force-dynamic";

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const flow = (searchParams.get("flow") as ReasonCode | "all") || "all";
    const department = searchParams.get("department") || undefined;
    const hostelBlock = searchParams.get("hostelBlock") || undefined;
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    const data = await getStudentRegister({
      date,
      flow,
      department,
      hostelBlock,
      year: isNaN(year as number) ? undefined : year,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Student register fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch student register",
        },
      },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "warden", "operator", "supervisor", "hod"],
  }),
  { keyPrefix: "student_register", maxRequests: 60 },
);

