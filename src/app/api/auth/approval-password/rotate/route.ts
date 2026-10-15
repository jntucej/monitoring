// src/app/api/auth/approval-password/rotate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/approval-password/rotate
//
// Rotates the user's existing approval password. The caller confirms the
// action with the CURRENT approval password so a session theft cannot rotate
// it silently. The new password is hashed (bcrypt cost 10) and must:
//   - be at least 8 characters,
//   - differ from the login password,
//   - differ from the current approval password.
// On success it stores the new approval_password_hash + approval_password_set_at,
// clears the step-up lockout counters, and audits APPROVAL_PASSWORD_ROTATED.
//
// Body: { currentApprovalPassword, newPassword }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { verifyPassword } from "@/lib/auth-token";
import { addAudit } from "@/lib/db";
import {
  validateApprovalPasswordPolicy,
  hashApprovalPassword,
  APPROVAL_PASSWORD_MIN_LENGTH,
} from "@/lib/permission-forward";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const auth = ctx.auth;

  let body: { currentApprovalPassword?: unknown; newPassword?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const currentApprovalPassword =
    typeof body.currentApprovalPassword === "string" ? body.currentApprovalPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!newPassword) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "newPassword is required" } },
      { status: 400 },
    );
  }
  if (newPassword.length < APPROVAL_PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: `newPassword must be at least ${APPROVAL_PASSWORD_MIN_LENGTH} characters` },
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("password_hash, approval_password_hash, approval_password_locked_until")
    .eq("id", auth.userId)
    .maybeSingle();

  if (userErr || !userRow) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 },
    );
  }

  const currentApprovalHash: string | null = userRow.approval_password_hash ?? null;
  if (!currentApprovalHash) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "No approval password is set yet; use the set endpoint first" } },
      { status: 400 },
    );
  }

  // Refuse to rotate while the approval password is locked.
  const lockedUntil: string | null = userRow.approval_password_locked_until ?? null;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Approval password is locked. Try again later." } },
      { status: 403 },
    );
  }

  // Verify the current approval password.
  const currentOk = await verifyPassword(currentApprovalPassword, currentApprovalHash);
  if (!currentOk) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Current approval password is incorrect" } },
      { status: 401 },
    );
  }

  // Policy: min length, differs from login, differs from current approval.
  const loginHash: string | null = userRow.password_hash ?? null;
  const policyErr = await validateApprovalPasswordPolicy(
    newPassword,
    loginHash,
    currentApprovalHash,
  );
  if (policyErr) {
    return NextResponse.json(
      { success: false, error: { code: policyErr.code, message: policyErr.message } },
      { status: 400 },
    );
  }

  const newHash = await hashApprovalPassword(newPassword);
  const nowIso = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      approval_password_hash: newHash,
      approval_password_set_at: nowIso,
      approval_password_failed_count: 0,
      approval_password_locked_until: null,
    })
    .eq("id", auth.userId);

  if (updateErr) {
    console.error("[Approval Password Rotate] update error:", updateErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 },
    );
  }

  addAudit({
    action: "APPROVAL_PASSWORD_ROTATED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    details: { rotatedAt: nowIso },
  }).catch((err) => console.error("[Approval Password Rotate] addAudit error:", err));

  return NextResponse.json({ success: true, data: { rotatedAt: nowIso } });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "approval_password_rotate", maxRequests: 10, windowMs: 15 * 60 * 1000 },
);
