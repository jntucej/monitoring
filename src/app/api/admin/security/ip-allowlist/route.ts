import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { updateIpAllowlist } from "@/lib/security";
import { addAudit } from "@/lib/db";
import { query } from "@/lib/postgres";
import { Role } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json();

    // M6: per-user allowlist update. { userId, cidrs: string[] | null }
    // sets (or clears, when null/empty) that user's allowed_cidrs column.
    if (body.userId && Array.isArray(body.cidrs)) {
      const cidrs = (body.cidrs as string[]).map((c: unknown) => String(c).trim()).filter(Boolean);
      await query(
        `UPDATE public.users SET allowed_cidrs = $1, updated_at = NOW() WHERE id = $2`,
        [cidrs.length ? cidrs : null, body.userId],
      );
      await addAudit({
        action: "IP_ALLOWLIST_UPDATED",
        userId: auth.userId,
        userName: auth.email,
        role: auth.role as Role,
        details: { targetUserId: body.userId, cidrs: cidrs.length ? cidrs : null },
      });
      return NextResponse.json({
        success: true,
        data: { userId: body.userId, cidrs: cidrs.length ? cidrs : null },
      });
    }

    const { allowedIps } = body;

    const updated = await updateIpAllowlist(
      Array.isArray(allowedIps) ? allowedIps : []
    );

    await addAudit({
      action: "SECURITY_SETTINGS_UPDATE",
      userId: auth.userId,
      userName: auth.email,
      role: auth.role as Role,
      details: `Updated security policies: IP allowlist [${updated.allowedIps.join(", ")}]`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: msg } }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["sysadmin"]});
