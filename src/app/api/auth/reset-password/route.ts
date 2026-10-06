import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signAccessToken, verifyAuthToken, hashPassword } from "@/lib/auth-token";
import { sendEmail } from "@/lib/integrations/email";

const SUCCESS_RESPONSE = {
  success: true,
  message: "If that email address exists in our system, a password reset link has been dispatched.",
};

async function handleResetPassword(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be JSON." } },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = body as Record<string, string>;

    // Case 1: Submitting new password with reset token
    if (token && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_PASSWORD", message: "New password must be at least 6 characters long." },
          },
          { status: 400 }
        );
      }

      const payload = await verifyAuthToken(token);
      if (!payload || !payload.sub) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_TOKEN", message: "Password reset token is invalid or has expired." },
          },
          { status: 400 }
        );
      }

      const newHash = await hashPassword(newPassword);
      await query("UPDATE users SET password_hash = $1, last_password_change = NOW() WHERE id = $2", [
        newHash,
        payload.sub,
      ]);

      return NextResponse.json(
        { success: true, message: "Password has been reset successfully. You may now log in." },
        { status: 200 }
      );
    }

    // Case 2: Requesting reset link
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_EMAIL", message: "Email is required." } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query("SELECT id, name, email FROM users WHERE LOWER(email) = $1 AND status = 'ACTIVE' LIMIT 1", [
      cleanEmail,
    ]);

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const resetToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        role: "reset_password",
      });

      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${origin}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Gate Monitor — Password Reset Request",
          body: `Hello ${user.name},\n\nA password reset request was initiated for your account. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, you can ignore this email.`,
          metadata: { userId: user.id, type: "password_reset" },
        });
      } catch (emailErr) {
        console.warn("Failed to dispatch password reset email:", emailErr);
      }
    }

    return NextResponse.json(SUCCESS_RESPONSE, { status: 200 });
  } catch (err: any) {
    console.error("[Reset Password Error]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to process reset request." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleResetPassword, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "reset_pwd_limit",
});
