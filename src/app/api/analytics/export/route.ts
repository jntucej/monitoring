import { NextRequest, NextResponse } from "next/server";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { exportDailyReport } from "@/lib/export";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const format = (params.get("format") as "pdf" | "csv") || "csv";
    const from = params.get("from") || new Date().toISOString().slice(0, 10);

    const result = await exportDailyReport(from, format);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "EXPORT_FAILED", message: "error" in result ? result.error : "Failed to export" } },
        { status: 400 }
      );
    }

    const contentType = format === "csv" ? "text/csv" : "text/html";
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to export report" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthAndStatus(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "supervisor"] })
);
