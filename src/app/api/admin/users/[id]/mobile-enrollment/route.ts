import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function generateCode(): string {
  // 8 chars from an unambiguous alphabet (no O/0/I/1/L)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}

function getUserIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const enrollmentIdx = segments.indexOf("mobile-enrollment");
  if (enrollmentIdx > 0) {
    return decodeURIComponent(segments[enrollmentIdx - 1]);
  }
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const userId = getUserIdFromPath(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_USER_ID", message: "User ID is required" } },
      { status: 400 }
    );
  }

  const service = getSupabaseServiceClient();

  // Invalidate any outstanding codes for this user
  await service
    .from("enrollment_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  const code = generateCode();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  const actorId = context?.auth?.userId || req.headers.get("x-user-id") || null;
  const actorRole = (context?.auth?.role || req.headers.get("x-user-role") || "admin") as Role;

  const { error } = await service.from("enrollment_codes").insert({
    user_id: userId,
    code_hash,
    expires_at,
    created_by: actorId,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  await addAudit({
    action: "MOBILE_ENROLLMENT_CODE_ISSUED",
    userId: actorId || "system",
    userName: context?.auth?.email || "Admin",
    role: actorRole,
    details: `Issued mobile enrollment code for user ${userId}; expires ${expires_at}`,
  });

  // Returned exactly once. The admin reads it out / hands it over.
  return NextResponse.json({
    success: true,
    data: { code, expiresAt: expires_at },
  });
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
