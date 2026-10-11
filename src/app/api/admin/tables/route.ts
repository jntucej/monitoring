import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET /api/admin/tables
 * Returns list of all tables in the database for backup/export UI
 */
async function handleGet(req: NextRequest) {
  const actorRole = req.headers.get("x-user-role");
  if (actorRole !== "sysadmin" && actorRole !== "admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "SysAdmin access required" } },
      { status: 403 }
    );
  }

  try {
    const tables = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );

    const tableNames = tables.map((row: any) => row.table_name);
    return NextResponse.json({ success: true, data: tableNames });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list tables" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
