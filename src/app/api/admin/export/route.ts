import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";
import { csvRow } from "@/lib/csv";

/**
 * GET /api/admin/export?table=users&format=csv
 * POST /api/admin/export - bulk export with { tables: string[], format: 'csv' }
 *
 * Security: only tables in ALLOWED_TABLES can be exported, and columns in
 * BLOCKED_COLUMNS are always stripped before leaving the server.
 */

const ALLOWED_TABLES = new Set([
  "gates",
  "movement_logs",
  "scans",
  "attendance_records",
  "daily_stats",
  "departments",
  "student_details",
]);

const BLOCKED_COLUMNS = new Set([
  "password_hash",
  "pin_hash",
  "initial_pin_hash",
  "totp_secret",
  "two_factor_secret",
  "two_factor_recovery_codes",
  "thumbprint_hash",
  "webauthn_credentials",
  "session_tokens",
]);

/**
 * Build the explicit column list for a table: fetch the column names from
 * information_schema and drop every sensitive column. Throws if the table
 * does not exist in the public schema.
 */
async function buildColumnList(tableName: string): Promise<string[]> {
  const res = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  if (res.rows.length === 0) {
    throw new Error(`Table ${tableName} not found`);
  }
  return res.rows.map((r: { column_name: string }) => r.column_name).filter(
    (col: string) => !BLOCKED_COLUMNS.has(col)
  );
}

async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
  const actorId = req.headers.get("x-user-id");
  const tableName = req.nextUrl.searchParams.get("table");
  const format = req.nextUrl.searchParams.get("format") || "csv";

  if (actorRole !== "sysadmin" && actorRole !== "admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "SysAdmin access required" } },
      { status: 403 }
    );
  }

  if (!tableName) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Table name required" } },
      { status: 400 }
    );
  }

  // Strict allowlist: only known-safe tables can be exported.
  if (!ALLOWED_TABLES.has(tableName)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Table export not permitted" } },
      { status: 403 }
    );
  }

  try {
    // Build an explicit, filtered column list (no SELECT *).
    const columnList = await buildColumnList(tableName);

    if (columnList.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY", message: "No exportable columns" } },
        { status: 404 }
      );
    }

    const columnSql = columnList.map((c: string) => `"${c}"`).join(", ");
    const data = (await query(`SELECT ${columnSql} FROM "${tableName}" LIMIT 10000`)).rows;

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY", message: "Table is empty" } },
        { status: 404 }
      );
    }

    // Audit every export.
    await addAudit({
      action: "ADMIN_EXPORT",
      userId: actorId ?? "unknown",
      role: actorRole as Role,
      details: { table: tableName, columns: columnList.length },
    }).catch(() => {});

    if (format === "csv") {
      // Generate CSV — every data cell is run through csvEscape to prevent
      // spreadsheet formula injection (e.g. =HYPERLINK(...), +CMD(...)).
      // csvRow handles proper CSV quoting (commas, quotes, newlines).
      const headers = columnList.join(",");
      const rows = data.map((row) =>
        csvRow(columnList.map((col) => row[col] == null ? "" : String(row[col])))
      );
      const csv = [headers, ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${tableName}_export.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error exporting table:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to export table" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
  const actorId = req.headers.get("x-user-id");

  if (actorRole !== "sysadmin" && actorRole !== "admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "SysAdmin access required" } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { tables = [], format = "csv" } = body;

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Tables array required" } },
        { status: 400 }
      );
    }

    // Validate all tables against the strict allowlist.
    const invalidTables = tables.filter(
      (t: string) => typeof t !== "string" || !ALLOWED_TABLES.has(t)
    );

    if (invalidTables.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: `Tables not permitted: ${invalidTables.join(", ")}` } },
        { status: 403 }
      );
    }

    // For bulk export, return JSON (CSV would be complex for multiple tables)
    const result: Record<string, any[]> = {};
    for (const table of tables as string[]) {
      const columnList = await buildColumnList(table);
      const columnSql = columnList.map((c: string) => `"${c}"`).join(", ");
      const { rows: data } = await query(`SELECT ${columnSql} FROM "${table}" LIMIT 10000`);
      result[table] = data;

      // Audit every export.
      await addAudit({
        action: "ADMIN_EXPORT",
        userId: actorId ?? "unknown",
        role: actorRole as Role,
        details: { table, columns: columnList.length },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in bulk export:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to export tables" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
