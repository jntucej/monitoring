import { NextRequest, NextResponse } from "next/server";
import { hash, compare, genSalt } from "@/server/lib/crypto";
import { findPersonByUniqueId, addAudit } from "@/lib/db";
import { generateMobileToken } from "@/lib/mobile-auth";
import { withRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role } from "@/lib/types";

function uniformFailure() {
  return NextResponse.json(
    { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
    { status: 401 }
  );
}

async function handlePost(req: NextRequest) {
  if (process.env.MOBILE_LOGIN_ENABLED === "false") {
    return NextResponse.json(
      { success: false, error: { code: "DISABLED", message: "Mobile login is temporarily disabled." } },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const { uniqueId, code, deviceId, password } = (body ?? {}) as Record<string, unknown>;

    if (!uniqueId || (!code && !password)) {
      return uniformFailure();
    }

    const formattedUniqueId = String(uniqueId).trim().toUpperCase();
    const identifierKey = `mobile_login_id:${formattedUniqueId}`;
    const idLimit = await checkRateLimit(identifierKey, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (idLimit.limited) {
      return uniformFailure();
    }

    const person = await findPersonByUniqueId(formattedUniqueId);
    if (!person || (person.status && person.status.toUpperCase() !== "ACTIVE")) {
      return uniformFailure();
    }

    if (password) {
      const { query } = await import("@/lib/postgres");
      const { verifyPassword } = await import("@/lib/auth-token");
      const userRes = await query(
        `SELECT * FROM users WHERE (UPPER(unique_id) = UPPER($1) OR LOWER(email) = LOWER($1)) AND status = 'ACTIVE' LIMIT 1`,
        [formattedUniqueId]
      );

      if (userRes.rows.length === 0) return uniformFailure();
      const user = userRes.rows[0];
      const credential = String(password || "").trim();
      let credentialValid = false;

      if (user.password_hash) credentialValid = await verifyPassword(credential, user.password_hash);
      if (!credentialValid) return uniformFailure();

      const targetDeviceId = String(deviceId || "mobile-device");
      const token = await generateMobileToken(person.id, person.uniqueId, targetDeviceId);

      await addAudit({
        action: "MOBILE_LOGIN",
        userId: person.id,
        userName: person.fullName,
        role: (person.personType || "student") as unknown as Role,
        details: { uniqueId: person.uniqueId, deviceId: targetDeviceId, method: "password" },
      });

      return NextResponse.json({
        success: true,
        token,
        person,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const service = getSupabaseServiceClient();
    const { data: rows } = await service
      .from("enrollment_codes")
      .select("id, code_hash, expires_at")
      .eq("user_id", person.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return uniformFailure();

    const ok = await compare(String(code), row.code_hash);
    if (!ok) return uniformFailure();

    const { data: burned, error: burnErr } = await service
      .from("enrollment_codes")
      .update({ used_at: new Date().toISOString(), used_device_id: String(deviceId) })
      .eq("id", row.id)
      .is("used_at", null)
      .select("id");

    if (burnErr || !burned || burned.length === 0) return uniformFailure();

    const token = await generateMobileToken(person.id, person.uniqueId, String(deviceId));

    await addAudit({
      action: "MOBILE_LOGIN",
      userId: person.id,
      userName: person.fullName,
      role: (person.personType || "student") as unknown as Role,
      details: {
        uniqueId: person.uniqueId,
        deviceId: String(deviceId),
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      token,
      person,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: unknown) {
    console.error("Mobile login error:", error);
    return uniformFailure();
  }
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "mobile_login",
  maxRequests: 10,
  windowMs: 60 * 1000,
});
