import { NextRequest, NextResponse } from "next/server";
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

      const passwordHash = await hashPassword(newPassword);

      const updateRes = await query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
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
