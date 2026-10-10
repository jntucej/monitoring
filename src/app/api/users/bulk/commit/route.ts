import { NextRequest, NextResponse } from "next/server";
import { validateImport, commitImport, ImportRow } from "@/lib/user-import";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const body = await req.json().catch(() => ({}));
    const { csvText, skipErrors = true } = body;
    let rows: ImportRow[] = body.rows;

    if (!rows && csvText && typeof csvText === "string") {
      const validation = await validateImport(csvText);
      const errorRows = new Set(validation.errors.map((e) => e.row));
      rows = skipErrors
        ? validation.rows.filter((r) => !errorRows.has(r.row))
        : validation.rows;

      if (!skipErrors && errorRows.size > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: `Validation failed with ${errorRows.size} error(s). Enable skipErrors to proceed with valid rows.`,
            },
          },
          { status: 400 }
        );
      }
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No valid user rows provided to commit" } },
        { status: 400 }
      );
    }

    const commitResult = await commitImport(rows, actorId, skipErrors);
    return NextResponse.json({
      success: true,
      data: commitResult,
    });
  } catch (error: any) {
    console.error("[UsersBulkCommit] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Import commit failed" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "users_bulk_commit", maxRequests: 10 }
);
