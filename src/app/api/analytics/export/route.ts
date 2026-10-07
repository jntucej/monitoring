import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { exportRangeReport } from "@/lib/server-export";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const format = (params.get("format") as "pdf" | "csv") || "csv";
    const from = params.get("from") || new Date().toISOString().slice(0, 10);
    const to = params.get("to") || from;
    const department = params.get("department") || undefined;
    const personType = params.get("personType") || undefined;
    const direction = params.get("direction") || undefined;
    const gate = params.get("gate") || undefined;
    const search = params.get("search") || undefined;
    const sortBy = (params.get("sortBy") as any) || undefined;

    const result = await exportRangeReport({
      from,
      to,
      format,
      department,
      personType,
      direction,
      gate,
      search,
      sortBy,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "EXPORT_FAILED", message: "error" in result ? result.error : "Failed to export" } },
        { status: 400 }
      );
    }

    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "text/html; charset=utf-8";
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

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
