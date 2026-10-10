import { NextRequest, NextResponse } from "next/server";
import { validateImport } from "@/lib/user-import";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const csvText = body.csvText || body.csv || "";

    if (!csvText || typeof csvText !== "string" || !csvText.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "csvText is required for validation" } },
        { status: 400 }
      );
    }

    const validationResult = await validateImport(csvText);
    return NextResponse.json({
      success: true,
      data: validationResult,
    });
  } catch (error: any) {
    console.error("[UsersBulkValidate] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Validation failed" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "users_bulk_validate", maxRequests: 20 }
);
