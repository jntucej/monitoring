import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { sendSMS } from "@/lib/integrations/sms";
import type { AuthContext } from "@/lib/authContext";

function getCode(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("token");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const tokenCode = getCode(req);
  if (!tokenCode) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_TOKEN", message: "token code required" } },
      { status: 400 }
    );
  }

  const { rows } = await query<{
    id: string;
    user_id: string;
    phone: string | null;
    name: string | null;
    used_at: string | null;
    revoked_at: string | null;
    expires_at: string;
  }>(
    `SELECT t.id, t.user_id, u.phone, u.name,
            t.used_at, t.revoked_at, t.expires_at
       FROM mess_tokens t
       JOIN users u ON u.id = t.user_id
      WHERE t.token_code = $1
      LIMIT 1`,
    [tokenCode]
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { success: false, error: { code: "TOKEN_NOT_FOUND", message: "Token not found" } },
      { status: 404 }
    );
  }

  if (row.used_at) {
    return NextResponse.json(
      { success: false, error: { code: "TOKEN_USED", message: "Token is already used" } },
      { status: 409 }
    );
  }
  if (row.revoked_at) {
    return NextResponse.json(
      { success: false, error: { code: "TOKEN_REVOKED", message: "Token is revoked" } },
      { status: 409 }
    );
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    return NextResponse.json(
      { success: false, error: { code: "TOKEN_EXPIRED", message: "Token has expired" } },
      { status: 409 }
    );
  }
  if (!row.phone) {
    return NextResponse.json(
      { success: false, error: { code: "NO_PHONE", message: "No phone on file for this student" } },
      { status: 400 }
    );
  }

  const message = `Your mess token code is ${tokenCode}. Valid until ${new Date(row.expires_at).toLocaleString()}. Do not share.`;
  const sms = await sendSMS({ to: row.phone, message });

  await addAudit({
    action: "MESS_TOKEN_SMS_SENT",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({ tokenCode, studentUserId: row.user_id, smsId: sms?.id ?? null }),
  });

  return NextResponse.json({
    success: true,
    data: {
      tokenCode,
      smsId: sms?.id ?? null,
      delivered: Boolean(sms),
    },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 10,
});
