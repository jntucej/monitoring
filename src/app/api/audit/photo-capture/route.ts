/**
 * POST /api/audit/photo-capture
 *
 * Issue #385: log that the operator captured a photo for visual verification
 * at the gate. The photo itself is never stored — this is a consent/audit trail
 * only, so that if a student later queries an unauthorized photo event, there
 * is a timestamped record of who captured it and for what purpose.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scannedUserId, gateId, direction } = body;

  if (typeof scannedUserId !== "string" || typeof gateId !== "string") {
    return NextResponse.json(
      { error: "scannedUserId and gateId are required strings" },
      { status: 400 },
    );
  }

  // await addAudit({
    action: "PHOTO_CAPTURED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    gateId: gateId,
    details: {
      scanned_user_id: scannedUserId,
      gate_id: gateId,
      direction: direction ?? null,
      captured_at: new Date().toISOString(),
      purpose: "visual_verification_at_gate",
      // The photo is NOT stored — this record is the audit trail only.
      retention: "not_stored",
    },
  });

  return NextResponse.json({ success: true });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "admin", "sysadmin"] as Role[],
});
