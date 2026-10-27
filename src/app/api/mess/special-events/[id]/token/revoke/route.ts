import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { revokeToken } from "@/lib/mess-event-token";
import type { AuthContext } from "@/lib/authContext";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);

function eventIdFromUrl(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("revoke");
  return i > 1 ? parts[i - 2] : "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role))
    return fail("FORBIDDEN", "Only mess in-charge can revoke tokens", 403);
  const eventId = eventIdFromUrl(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const body = (await req.json().catch(() => null)) as
    { tokenId?: string; roll?: string; reason?: string } | null;

  let tokenId = body?.tokenId ?? null;
  if (!tokenId && body?.roll) {
    const { rows } = await query<{ id: string }>(
      `SELECT t.id
         FROM public.mess_event_tokens t
         JOIN public.users u ON u.id = t.user_id
        WHERE t.event_id = $1 AND u.unique_id = $2
          AND t.used_at IS NULL AND t.revoked_at IS NULL
        LIMIT 1`,
      [eventId, body.roll.trim().toUpperCase()],
    );
    tokenId = rows[0]?.id ?? null;
  }
  if (!tokenId) return fail("NOT_FOUND", "No active token found", 404);

  const revoked = await revokeToken(tokenId, auth.userId, body?.reason ?? "manual revoke");
  return revoked
    ? ok({ revoked: true })
    : fail("CONFLICT", "Token already used or revoked", 409);
}

export const POST = withAuthorization(
  withRateLimit(handlePost, { windowMs: 60_000, maxRequests: 60 }),
  {},
);
