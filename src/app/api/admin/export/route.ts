import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET /api/admin/export?table=users&format=csv
 * POST /api/admin/export - bulk export with { tables: string[], format: 'csv' }
 */
async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
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

  try {
    // Validate table name to prevent SQL injection
    const validTable = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );

    if (validTable.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Table not found" } },
        { status: 404 }
      );
    }

    // Fetch data
    const data = await query(`SELECT * FROM "${tableName}" LIMIT 10000`);
    
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY", message: "Table is empty" } },
        { status: 404 }
      );
    }

    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? ''
        ).join(",")
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

    // Validate all tables exist
    const placeholders = tables.map((_, i) => `$${i + 2}`).join(",");
    const validTables = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name IN (${placeholders})`,
      ["public", ...tables]
    );

    const validTableNames = validTables.map((t: any) => t.table_name);
    const invalidTables = tables.filter((t: string) => !validTableNames.includes(t));

    if (invalidTables.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Tables not found: ${invalidTables.join(", ")}` } },
        { status: 404 }
      );
    }

    // For bulk export, return JSON (CSV would be complex for multiple tables)
    const result: Record<string, any[]> = {};
    for (const table of tables) {
      const data = await query(`SELECT * FROM "${table}" LIMIT 10000`);
      result[table] = data;
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
