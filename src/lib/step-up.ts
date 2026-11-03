// src/lib/step-up.ts
// ─────────────────────────────────────────────────────────────────────────────
// M1 — Step-up re-authentication. Before any destructive action the caller
// must re-enter their password within the last STEP_UP_WINDOW_MS (5 min).
// A stolen access_token cookie alone is not enough.
//
// The marker lives on public.sessions.step_up_at. The session row is the
// user's most-recent unrevoked session; the step-up call stamps it, and
// assertFreshStepUp verifies it is still fresh.
// ─────────────────────────────────────────────────────────────────────────────

import { query } from "@/lib/postgres";
import { verifyPassword } from "@/lib/auth-token";
import { AppError } from "@/server/http/errors";

const STEP_UP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export class StepUpRequiredError extends AppError {
  constructor() {
    super("STEP_UP_REQUIRED", "Re-enter your password to continue", 401);
  }
}

/**
 * Confirms the caller's most-recent session has a fresh step-up (< 5 min).
 * Throws StepUpRequiredError (401, code STEP_UP_REQUIRED) otherwise. Called
 * by withMutationGuard when a route declares `requiresStepUp: true`.
 */
export async function assertFreshStepUp(userId: string): Promise<void> {
  const { rows } = await query<{ step_up_at: string | null }>(
    `SELECT step_up_at FROM public.sessions
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  const at = rows[0]?.step_up_at ? new Date(rows[0].step_up_at).getTime() : 0;
  if (Date.now() - at > STEP_UP_WINDOW_MS) {
    throw new StepUpRequiredError();
  }
}

/**
 * Verifies the password and, if correct, stamps the caller's active
 * sessions as stepped up. Called from POST /api/auth/step-up.
 */
export async function performStepUp(
  userId: string,
  password: string,
): Promise<void> {
  const { rows } = await query<{ password_hash: string | null; status: string }>(
    "SELECT password_hash, status FROM public.users WHERE id = $1 AND deleted_at IS NULL",
    [userId],
  );
  if (!rows.length || !rows[0].password_hash) {
    throw new AppError("FORBIDDEN", "account not found", 403);
  }
  if (rows[0].status !== "ACTIVE") {
    throw new AppError("ACCOUNT_INACTIVE", "account is not active", 403);
  }
  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) throw new AppError("INVALID_CREDENTIALS", "incorrect password", 401);
  await query(
    `UPDATE public.sessions SET step_up_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}
