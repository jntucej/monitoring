import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signPasswordResetToken, verifyPasswordResetToken, hashPassword } from "@/lib/auth-token";
import { assertCsrf } from "@/lib/csrf";
import { sendEmail } from "@/lib/integrations/email";

const SUCCESS_RESPONSE = {
  success: true,
  message: "If the email address exists in the system, a password reset link has been dispatched.",
};

async function handleResetPassword(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be JSON." } },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = body as Record<string, string>;

    // Case 1: Submitting new password with a reset token
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

      const payload = await verifyPasswordResetToken(token);
      if (!payload || !payload.sub) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_TOKEN", message: "Password reset token is invalid or expired." },
          },
          { status: 400 }
        );
      }

      // Check DB revocation & single-use tracking in password_reset_tokens
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      let tokenCheck;
      try {
        tokenCheck = await query(
          "SELECT id FROM password_reset_tokens WHERE token_hash = $1 AND used IS NOT TRUE AND expires_at > NOW() LIMIT 1",
          [tokenHash]
        );
      } catch (err: any) {
        console.error("[Auth:ResetPassword] token table lookup failed:", err.message);
        return NextResponse.json(
          { success: false, error: { code: "SERVER_ERROR", message: "Password reset is temporarily unavailable." } },
          { status: 500 }
        );
      }

      if (tokenCheck.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_TOKEN", message: "Password reset token has already been used or expired." },
          },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(newPassword);

      const updateRes = await query(
        "UPDATE users SET password_hash = $1, session_version = COALESCE(session_version, 0) + 1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
        [passwordHash, payload.sub]
      );

      if (updateRes.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "USER_NOT_FOUND", message: "User not found." },
          },
          { status: 404 }
        );
      }

      // Mark token used and revoke sessions
      // Bug 130: live schema (schema.sql) uses `used BOOLEAN`, not `used_at`. The old
      // `SET used_at = NOW()` referenced a column that doesn't exist and threw (swallowed).
      await query("UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1", [tokenHash]).catch(() => {});
      await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1", [payload.sub]).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Password has been successfully updated. You can now log in.",
      });
    }

    // Case 2: Requesting a password reset link via email
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      const userRes = await query(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
        [trimmedEmail]
      );

      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const resetToken = await signPasswordResetToken(user.id, user.email);
        const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
        const tokenId = crypto.randomUUID();

        // Record single-use reset token in DB with 1h expiry
        let tokenPersisted = true;
        try {
          await query(
            "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW())",
            [tokenId, user.id, tokenHash]
          );
        } catch (err: any) {
          console.error("[Auth:ResetPassword] cannot persist token:", err.message);
          tokenPersisted = false;
        }

        if (tokenPersisted) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

          try {
            await sendEmail({
              to: user.email,
              subject: "Gate Monitor - Password Reset Request",
              body: `Hello ${user.name || "User"},\n\nPlease use the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
              html: `<p>Hello ${user.name || "User"},</p><p>Please use the following link to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`,
            });
          } catch (emailErr) {
            console.error("[Auth:ResetPassword] Failed to send email:", emailErr);
          }
        }
      }

      return NextResponse.json(SUCCESS_RESPONSE);
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_REQUEST", message: "Provide either email or both token and newPassword." },
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[Auth:ResetPassword] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error occurred." },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleResetPassword, {
  keyPrefix: "auth_reset_password",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});
