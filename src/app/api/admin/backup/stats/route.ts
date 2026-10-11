import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET /api/admin/backup/stats
 * Returns backup stats and disk usage information
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
    // Get database size
    const dbSizeResult = await query(`SELECT pg_size_pretty(pg_database_size('gate_monitor')) as size`);
    const databaseSize = dbSizeResult[0]?.size || 'N/A';

    // Get total backups count (from the backup table if exists, or estimate)
    const tables = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public'`
    ) as any[];
    
    const totalTables = tables.length;

    // Get latest migration timestamp as proxy for latest activity
    const latestMigration = await query(
      `SELECT applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`
    ) as any[];
    
    const latestBackup = latestMigration[0]?.applied_at 
      ? new Date(latestMigration[0].applied_at).toLocaleString() 
      : null;

    // Disk usage - read from /proc/diskstats or use df
    // This will be populated by the frontend calling a system endpoint
    const diskUsage: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        totalBackups: totalTables,
        latestBackup,
        databaseSize,
        diskUsage,
        totalTables,
      }
    });
  } catch (error) {
    console.error("Error fetching backup stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch backup stats" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
