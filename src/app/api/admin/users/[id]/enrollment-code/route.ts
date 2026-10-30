import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { hash } from "@/server/lib/crypto";
import { query } from "@/lib/postgres";
import { createBootstrapToken } from "@/lib/bootstrap-link";
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

  const currentRole = (ctx.auth.role === "admin" || ctx.auth.role === "sysadmin") ? ctx.auth.role : "sysadmin";

  try {
    // Invalidate any existing active codes for this user and purpose.
    await query(
      `UPDATE enrollment_codes SET used_at = NOW()
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [userId, purpose],
      { currentRole }
    );

    const code = generateCode();
    const code_hash = await hash(code, 10);
    const expires_at = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

    await query(
      `INSERT INTO enrollment_codes (user_id, code_hash, purpose, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, code_hash, purpose, expires_at, ctx.auth.userId],
      { currentRole }
    );

    await addAudit({
      action: "ENROLLMENT_CODE_ISSUED",
      userId: ctx.auth.userId,
      userName: ctx.auth.email,
      role: ctx.auth.role as Role,
      details: `Issued ${purpose} enrollment code for user ${userId}; expires ${expires_at}`,
    });

    // Build a secure, shareable activation link scoped to this user.
    const baseUrl = req.nextUrl.origin;
    const token = createBootstrapToken(userId, 24 * 60 * 60 * 1000);
    const bootstrapLink = `${baseUrl}/bootstrap?t=${encodeURIComponent(token)}`;

    return NextResponse.json({
      success: true,
      data: { code, purpose, expiresAt: expires_at, bootstrapLink },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: err?.message || "Failed to issue enrollment code" } },
      { status: 500 }
    );
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });