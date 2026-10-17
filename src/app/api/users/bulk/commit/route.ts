/* eslint-disable */
// src/app/api/users/bulk/commit/route.ts
// LIVE: called by CsvBulkImporter and BulkUserImportModal (sysadmin console).
// (The parallel /api/admin/users/bulk/* set is used by UserManagementPanel.)
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { runBulkImport, type BulkImportReport } from "@/lib/user-import";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCsv = body.csv || body.csvText || body.content || null;
    const preRows = Array.isArray(body.rows) ? body.rows : null;

    // Accept either raw CSV text (fresh from the modal / importer) or a
    // pre-validated row array (older CsvBulkImporter path). runBulkImport
    // handles both via its csvInput union type.
    const payload: string | unknown[] = preRows ? preRows : rawCsv;
    if (payload == null || (typeof payload === "string" && !payload.trim())) {
      return NextResponse.json({ success: false, error: { message: "No CSV content supplied" } }, { status: 400 });
    }

    const { report, committedRows } = await runBulkImport(
      payload as string | Array<import("@/lib/user-import").ImportRow>,
      context.auth.userId,
      body.skipErrors !== false
    );

    // A per-row outcome that maps the commit result back onto the report for
    // any row that errored during the actual insert.
    const commitErrors = report.rows.filter((r) => r.status === "invalid" && r.reason.startsWith("commit failed"));
    void commitErrors;

    return NextResponse.json({
      success: true,
      data: {
        importedCount: committedRows.length,
        failedCount: report.invalid,
        skipped: report.skipped,
        report,
      } satisfies {
        importedCount: number;
        failedCount: number;
        skipped: number;
        report: BulkImportReport;
      },
      // Also expose the classic shape for the older CsvBulkImporter caller.
      ...report,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Commit failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
