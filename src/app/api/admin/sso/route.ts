import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSSOConfig, updateSSOConfig } from "@/lib/sso";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handleGet() {
  try {
    const config = await getSSOConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateSSOConfig(body);
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    await addAudit({
      action: "SSO_CONFIG_UPDATE",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Updated SSO/OIDC config for provider '${updated.providerId}'. Enabled: ${updated.enabled}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin"] });
export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin"] });
