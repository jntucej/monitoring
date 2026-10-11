import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET /api/admin/disk-status
 * Returns disk usage information with alerts
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
    // Simulate disk status - in production this would read from system
    const diskUsage = [
      {
        filesystem: "/dev/nvme0n1p6",
        size: "724G",
        used: "110G",
        avail: "578G",
        usePercent: "16%",
        mounted: "/",
        status: "normal" as const,
      },
    ];

    // Calculate total usage percentage
    const totalPercent = parseInt(diskUsage[0].usePercent.replace('%', ''));
    
    // Generate alerts based on usage
    const alerts: any[] = [];
    
    if (totalPercent > 90) {
      alerts.push({
        type: "critical",
        message: `Disk usage critical: ${totalPercent}% used. Immediate action required!`,
        timestamp: new Date().toISOString(),
      });
    } else if (totalPercent > 75) {
      alerts.push({
        type: "warning",
        message: `Disk usage high: ${totalPercent}% used. Consider cleaning up old backups.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check database size
    const dbSizeResult = await query(`SELECT pg_size_pretty(pg_database_size('gate_monitor')) as size`);
    const databaseSize = dbSizeResult[0]?.size || 'N/A';

    // Check backup frequency
    const backupCheck = await query(
      `SELECT COUNT(*) as count FROM schema_migrations WHERE applied_at > NOW() - INTERVAL '1 hour'`
    ) as any[];

    return NextResponse.json({
      success: true,
      data: {
        diskUsage,
        databaseSize,
        alerts,
        lastBackupCheck: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Error fetching disk status:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch disk status" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
