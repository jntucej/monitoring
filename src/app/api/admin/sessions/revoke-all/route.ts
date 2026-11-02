import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { invalidateAuthCache } from "@/lib/authContext";
import type { AuthContext } from "@/lib/authContext";

/**
 * Batch D: POST /api/admin/sessions/revoke-all — sysadmin-only fleet-wide
 * session revocation (Meta's "invalidate everything" runbook). Bumps
 * users.session_version for everyone (every live JWT dies) and revokes
 * every unrevoked session row. keepSelf=true spares the caller's own
 * sessions so the admin doesn't lock themselves out mid-incident.
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { reason?: string; keepSelf?: boolean };
  const reason = String(body.reason ?? "manual").slice(0, 500);
  const keepSelf = body.keepSelf === true;
  const keepId = keepSelf ? auth.userId : null;

  const bumped = await query<{ count: number }>(
    `UPDATE public.users
        SET session_version = session_version + 1, updated_at = NOW()
      WHERE deleted_at IS NULL
        AND ($1::uuid IS NULL OR id <> $1)`,
    [keepId],
  );

  await query(
    `UPDATE public.sessions
        SET revoked_at = NOW()
      WHERE revoked_at IS NULL
        AND ($1::uuid IS NULL OR user_id <> $1)`,
    [keepId],
  );

  // Invalidate every cached auth entry — the version bump alone is
  // picked up on the next verify, but a warm cache would serve the old
  // (now-revoked) identity for its TTL.
  invalidateAuthCache("*");

  try {
    await addAudit({
      action: "SESSION_FORCE_REVOKED",
      userId: auth.userId,
      userName: "admin",
      role: auth.role,
      details: { scope: keepSelf ? "all-except-self" : "all", reason },
    });
  } catch {
    /* audit is best-effort — the revocation already happened */
  }

  return NextResponse.json({
    success: true,
    data: { revoked: bumped.rowCount ?? 0, keepSelf, reason },
  });
}

export const POST = withMutationGuard(handlePost, { requiredRole: ["sysadmin"] });
