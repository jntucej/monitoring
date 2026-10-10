import { NextRequest, NextResponse } from "next/server";
import { createDatabaseBackup, listBackups, restoreDatabaseBackup } from "@/lib/backup";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/backup - List database backups
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
    const backups = await listBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list backups" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/backup - Create or Restore backup
 * Body format for create: { action: "create", anonymize?: boolean, tables?: string[] }
 * Body format for restore: { action: "restore", backupData: Record<string, any[]>, truncate?: boolean }
 */
async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  const actorRole = req.headers.get("x-user-role");

  if (!actorId || (actorRole !== "sysadmin" && actorRole !== "admin")) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "SysAdmin access required" } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action = "create", anonymize = false, tables, backupData, truncate = false, checksum } = body;

    if (action === "restore") {
      if (!backupData || typeof backupData !== "object") {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Invalid backup data provided for restore" } },
          { status: 400 }
        );
      }

      // Optional integrity gate: callers may pass the SHA-256 checksum recorded
      // at backup time; a mismatched payload aborts before touching the database.
      const result = await restoreDatabaseBackup(backupData, {
        truncate,
        expectedChecksum: typeof checksum === "string" && checksum.trim() !== "" ? checksum : undefined,
      });

      // await addAudit({
        action: "BACKUP_RESTORED",
        userId: actorId,
        userName: "Admin",
        role: actorRole as Role,
        details: `Restored tables: ${result.restoredTables.join(", ")}; Errors: ${result.errors.length}`,
      });

      return NextResponse.json({ success: result.success, data: result });
    }

    // Default action: Create backup
    const result = await createDatabaseBackup(actorId, {
      anonymize,
      includeTables: Array.isArray(tables) && tables.length > 0 ? tables : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "BACKUP_FAILED", message: result.error || "Failed to create backup" } },
        { status: 500 }
      );
    }

    // await addAudit({
      action: "BACKUP_CREATED",
      userId: actorId,
      userName: "Admin",
      role: actorRole as Role,
      details: `Created backup file ${result.metadata?.filename} with ${result.metadata?.recordCount} records`,
    });

    return NextResponse.json({ success: true, data: result.metadata, dump: result.data });
  } catch (error) {
    console.error("Error in backup operation:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Backup operation failed" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_backup_get", maxRequests: 30 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_backup_post", maxRequests: 10 }
);
