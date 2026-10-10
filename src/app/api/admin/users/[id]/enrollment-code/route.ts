import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function generateCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

function userIdFromPath(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("enrollment-code");
  return decodeURIComponent(segs[idx - 1] || "");
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const userId = userIdFromPath(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: { code: "INVALID_USER_ID", message: "User ID required" } }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (!["mobile", "web_bootstrap", "pin_reset"].includes(body.purpose)) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid purpose" } }, { status: 400 });
  }
  const purpose: "mobile" | "web_bootstrap" | "pin_reset" = body.purpose;
  const ttlMinutes = purpose === "mobile" ? 15 : 60 * 24;

  const svc = getSupabaseServiceClient();

  await svc.from("enrollment_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId).eq("purpose", purpose).is("used_at", null);

  const code = generateCode();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

  const { error } = await svc.from("enrollment_codes").insert({
    user_id: userId, code_hash, purpose, expires_at, created_by: ctx.auth.userId,
  });
  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  await addAudit({
    action: "ENROLLMENT_CODE_ISSUED",
    userId: ctx.auth.userId,
    userName: ctx.auth.email,
    role: ctx.auth.role as Role,
    details: `Issued ${purpose} enrollment code for user ${userId}; expires ${expires_at}`,
  });

  return NextResponse.json({ success: true, data: { code, purpose, expiresAt: expires_at } });
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });