/* eslint-disable */
// src/app/api/users/bulk/commit/route.ts
// LIVE: called by CsvBulkImporter and BulkUserImportModal (sysadmin console).
// (The parallel /api/admin/users/bulk/* set is used by UserManagementPanel.)
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { commitImport, validateImport } from "@/lib/user-import";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => ({}));
    let rows = body.rows;
    // Accept all three CSV payload keys the UIs send: csv (BulkUserImportModal),
    // csvText (CsvBulkImporter), or rows (pre-validated array).
    const rawCsv = body.rows ? null : (body.csv || body.csvText || body.content || null);
    if (!rows && rawCsv) {
      const val = await validateImport(rawCsv);
      rows = val.validRows;
    }
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ success: false, error: { message: "Invalid rows array" } }, { status: 400 });
    }
    const result = await commitImport(rows, context.auth.userId, body.skipErrors !== false);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Commit failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
