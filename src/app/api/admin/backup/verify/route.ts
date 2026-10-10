import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { verifyLatestBackup, listBackupVerifications } from "@/lib/backup";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handleGet() {
  try {
    const verifications = await listBackupVerifications();
    return NextResponse.json({ success: true, data: verifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const result = await verifyLatestBackup();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    await addAudit({
      action: "BACKUP_VERIFIED",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Executed backup integrity verification run. Status: ${result.status}. Records checked: ${result.recordsVerified}.`,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
