import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findPersonByUniqueId, getPersonHistory, addAudit } from "@/lib/db";
import { generateMobileToken, validateMobileToken } from "@/lib/mobile-auth";
import { withRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role } from "@/lib/types";

function uniformFailure() {
  return NextResponse.json(
    { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
    { status: 401 }
  );
}

async function handlePost(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const path = params.path ? params.path.join("/") : "";

  if (path === "login") {
    if (process.env.MOBILE_LOGIN_ENABLED === "false") {
      return NextResponse.json(
        { success: false, error: { code: "DISABLED", message: "Mobile login is temporarily disabled." } },
        { status: 503 }
      );
    }

    try {
      const body = await req.json().catch(() => null);
      const { uniqueId, code, deviceId, password, pin } = (body ?? {}) as Record<string, unknown>;

      if (!uniqueId || (!code && !password && !pin)) {
        return uniformFailure();
      }

      const formattedUniqueId = String(uniqueId).trim().toUpperCase();

      // Rate-limit per uniqueId, not per IP (§4.1)
      const identifierKey = `mobile_login_id:${formattedUniqueId}`;
      const idLimit = await checkRateLimit(identifierKey, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
      if (idLimit.limited) {
        return uniformFailure();
      }

      const person = await findPersonByUniqueId(formattedUniqueId);
      if (!person) {
        return uniformFailure();
      }

      if (person.status && person.status.toUpperCase() !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: { code: "ACCOUNT_INACTIVE", message: `Account is ${person.status}` } },
          { status: 403 }
        );
      }

      // Check if login with password or pin
      if (password || pin) {
        const { query } = await import("@/lib/postgres");
        const { verifyPassword } = await import("@/lib/auth-token");
        const userRes = await query(
          `SELECT * FROM users WHERE (UPPER(unique_id) = UPPER($1) OR LOWER(email) = LOWER($1)) AND status = 'ACTIVE' LIMIT 1`,
          [formattedUniqueId]
        );

        if (userRes.rows.length === 0) {
          return uniformFailure();
        }

        const user = userRes.rows[0];
        const credential = String(password || pin || "").trim();
        let credentialValid = false;

        if (user.password_hash) {
          credentialValid = await verifyPassword(credential, user.password_hash);
        }
        if (!credentialValid && user.pin_hash) {
          credentialValid = await verifyPassword(credential, user.pin_hash);
        }
        if (!credentialValid && user.initial_pin_hash) {
          credentialValid = await verifyPassword(credential, user.initial_pin_hash);
        }

        if (!credentialValid) {
          return uniformFailure();
        }

        const { isMfaRequiredForAdmin } = await import("@/lib/authContext");
        const requiresMfa =
          (user.role === "sysadmin" || user.role === "admin" || user.two_factor_enabled) &&
          (user.two_factor_enabled || (await isMfaRequiredForAdmin()));

        if (requiresMfa) {
          const presentedTotp = body.totp_code ? String(body.totp_code).trim() : null;
          if (!presentedTotp) {
            return NextResponse.json(
              {
                success: false,
                mfa_required: true,
                message: "Two-factor authentication code required for this account.",
              },
              { status: 403 }
            );
          }
          const { verifyTOTPCode } = await import("@/lib/totp");
          const { decryptSecret } = await import("@/lib/mfa-secret");
          const secret = user.two_factor_secret ? decryptSecret(user.two_factor_secret) : null;
          const totpOk = secret && verifyTOTPCode(secret, presentedTotp);
          if (!totpOk) {
            return uniformFailure();
          }
        }

        const targetDeviceId = String(deviceId || "mobile-device");
        const token = await generateMobileToken(person.id, person.uniqueId, targetDeviceId);

        await addAudit({
          action: "MOBILE_LOGIN",
          userId: person.id,
          userName: person.fullName,
          role: (person.personType || "student") as unknown as Role,
          details: {
            uniqueId: person.uniqueId,
            deviceId: targetDeviceId,
            method: password ? "password" : "pin",
          },
        });

        return NextResponse.json({
          success: true,
          token,
          person,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }

    if (person.status && person.status.toUpperCase() !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: { code: "ACCOUNT_INACTIVE", message: `Account is ${person.status}` } },
          { status: 403 }
        );
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
      if (!row) {
        return uniformFailure();
      }

      const ok = await bcrypt.compare(String(code), row.code_hash);
      if (!ok) {
        return uniformFailure();
      }

      // Burn the code atomically
      const { data: burned, error: burnErr } = await service
        .from("enrollment_codes")
        .update({
          used_at: new Date().toISOString(),
          used_device_id: String(deviceId),
        })
        .eq("id", row.id)
        .is("used_at", null)
        .select("id");

      if (burnErr || !burned || burned.length === 0) {
        return uniformFailure();
      }

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

  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: `Unknown mobile action: ${path}` } },
    { status: 404 }
  );
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "mobile",
  maxRequests: 10,
  windowMs: 60 * 1000,
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const path = params.path ? params.path.join("/") : "";

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceId = req.headers.get("x-device-id") || undefined;
  const token = authHeader.split(" ")[1];
  const person = await validateMobileToken(token, deviceId);

  if (!person) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  if (path === "profile") return NextResponse.json({ person });
  if (path === "history") {
    const history = await getPersonHistory(person.id);
    return NextResponse.json({ history });
  }
  if (path === "idcard") {
    return NextResponse.json({
      uniqueId: person.uniqueId,
      fullName: person.fullName,
      personType: person.personType,
      department: person.department,
      designation: person.designation,
      photoUrl: person.photoUrl,
      qrCode: person.qrCode,
      status: person.status,
    });
  }
  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}
