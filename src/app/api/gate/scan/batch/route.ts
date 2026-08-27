import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { scans } = body;

    if (!Array.isArray(scans)) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Array of scans required" } }, { status: 400 });
    }

    const actorId = req.headers.get("x-user-id") || "operator";
    const actorRole = (req.headers.get("x-user-role") || "operator") as Role;

    const processed = scans.map((s: any) => ({
      clientEventId: s.clientEventId,
      status: "APPROVED",
      gateId: s.gateId,
      syncedAt: new Date().toISOString(),
    }));

    await addAudit({
      action: "BATCH_SCANS_SYNCED",
      userId: actorId,
      userName: "Operator",
      role: actorRole,
      details: `Batch synced ${scans.length} offline gate scan events.`,
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedCount: scans.length,
        processed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin"] });
