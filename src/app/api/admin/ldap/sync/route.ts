import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { executeLDAPSync } from "@/lib/ldap";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handlePost(req: NextRequest) {
  try {
    const result = await executeLDAPSync();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    await addAudit({
      action: "LDAP_SYNC",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Triggered Active Directory sync. Users processed: ${result.usersProcessed}, Created: ${result.usersCreated}, Updated: ${result.usersUpdated}`,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
