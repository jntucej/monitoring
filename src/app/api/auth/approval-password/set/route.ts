// src/app/api/auth/approval-password/set/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/approval-password/set
//
// First-time (or re-set) of the user's approval password. The caller confirms
// the action with their LOGIN password (currentPassword) so a session theft
// cannot install an approval password silently. The new approval password is
// hashed (bcrypt cost 10) and must:
//   - be at least 8 characters,
//   - differ from the login password,
//   - differ from the current approval password (if one is set).
// On success it stores approval_password_hash + approval_password_set_at,
// clears the step-up lockout counters, and audits APPROVAL_PASSWORD_SET.
//
// Body: { newPassword, currentPassword }
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

  let body: { newPassword?: unknown; currentPassword?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

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
    .select("password_hash, approval_password_hash, role")
    .eq("id", auth.userId)
    .maybeSingle();

  if (userErr || !userRow) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 },
    );
  }

  // Verify the login password.
  const loginHash: string | null = userRow.password_hash ?? null;
  if (!loginHash) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "No login password is set for this account" } },
      { status: 400 },
    );
  }
  const loginOk = await verifyPassword(currentPassword, loginHash);
  if (!loginOk) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Login password is incorrect" } },
      { status: 401 },
    );
  }

  // Policy: min length, differs from login, differs from current approval.
  const policyErr = await validateApprovalPasswordPolicy(
    newPassword,
    loginHash,
    userRow.approval_password_hash ?? null,
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
    console.error("[Approval Password Set] update error:", updateErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 },
    );
  }

  addAudit({
    action: "APPROVAL_PASSWORD_SET",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    details: { setAt: nowIso },
  }).catch((err) => console.error("[Approval Password Set] addAudit error:", err));

  return NextResponse.json({ success: true, data: { setAt: nowIso } });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "approval_password_set", maxRequests: 10, windowMs: 15 * 60 * 1000 },
);
