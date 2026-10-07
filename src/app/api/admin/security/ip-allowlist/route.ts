import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { updateIpAllowlist } from "@/lib/security";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { allowedIps, forced2FA } = body;

    const updated = await updateIpAllowlist(
      Array.isArray(allowedIps) ? allowedIps : [],
      forced2FA
    );

    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    await addAudit({
      action: "SECURITY_SETTINGS_UPDATE",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Updated security policies: IP allowlist [${updated.allowedIps.join(", ")}], Forced 2FA: ${updated.forced2FA}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
