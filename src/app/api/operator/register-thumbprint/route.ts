import { NextRequest, NextResponse } from "next/server";
import { registerThumbprint, clearThumbprint, hashThumbprint, addAudit, findUserById } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = (req.headers.get("x-user-role") || "admin") as Role;
    const body = await req.json().catch(() => ({}));
    const { userId, signature, clear } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userId is required" } },
        { status: 400 }
      );
    }

    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Guard: operators cannot register or clear thumbprints for sysadmin/admin accounts
    if (actorRole === "operator" && (targetUser.role === "admin" || targetUser.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Operators cannot modify biometric records of administrators" } },
        { status: 403 }
      );
    }

    if (clear) {
      const ok = await clearThumbprint(userId);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { code: "DB_ERROR", message: "Failed to clear thumbprint" } },
          { status: 500 }
        );
      }

      // await addAudit({
        userId: actorId,
        action: "THUMBPRINT_CLEARED",
        role: actorRole,
        details: { targetUserId: userId, targetName: targetUser.name },
      });

      return NextResponse.json({ success: true, message: "Thumbprint cleared successfully" });
    }

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Biometric signature is required" } },
        { status: 400 }
      );
    }

    const hashed = await hashThumbprint(signature);
    const ok = await registerThumbprint(userId, hashed);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to save thumbprint" } },
        { status: 500 }
      );
    }

    // await addAudit({
      userId: actorId,
      action: "THUMBPRINT_REGISTERED",
      role: actorRole,
      details: { targetUserId: userId, targetName: targetUser.name },
    });

    return NextResponse.json({ success: true, message: "Thumbprint registered successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "register_thumbprint", maxRequests: 30 }
);
