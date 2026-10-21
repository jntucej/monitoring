import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const CONSENT_DEFS = [
  {
    scope: "core_service",
    label: "Campus services",
    description:
      "You agree to MyCampus recording entry/exit at campus gates for safety and attendance.",
    required: true,
    version: "1.0",
  },
  {
    scope: "guardian_notifications",
    label: "Guardian notifications",
    description:
      "Allow MyCampus to notify your guardian about leave, medical, and emergency events. Routine daily outings are not reported.",
    required: false,
    version: "1.0",
  },
  {
    scope: "biometric_verification",
    label: "Biometric verification",
    description:
      "Allow fingerprint or face verification at gates. You can always use your ID card instead.",
    required: false,
    version: "1.0",
  },
];

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  try {
    const { rows } = await query<{ scope: string; granted_at: string | null; version: string }>(
      `SELECT scope, granted_at, version
       FROM consent_records
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [auth.userId],
    );
    const active = new Map(rows.map((r) => [r.scope, r]));

    return ok({
      consents: CONSENT_DEFS.map((def) => {
        const row = active.get(def.scope);
        return {
          ...def,
          granted: !!row,
          grantedAt: row?.granted_at ?? null,
        };
      }),
    });
  } catch (e) {
    return fail("DB_ERROR", (e as Error).message, 500);
  }
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { scope, granted } = body as { scope?: string; granted?: boolean };

    if (!scope || typeof granted !== "boolean") {
      return fail("BAD_REQUEST", "scope and granted are required.", 400);
    }
    const def = CONSENT_DEFS.find((d) => d.scope === scope);
    if (!def) {
      return fail("BAD_REQUEST", `Unknown scope: ${scope}`, 400);
    }
    if (def.required && !granted) {
      return fail(
        "FORBIDDEN",
        "This consent is required to use MyCampus. Contact IT to close your account.",
        403,
      );
    }

    if (granted) {
      await query(
        `UPDATE consent_records
         SET revoked_at = NOW()
         WHERE user_id = $1 AND scope = $2 AND revoked_at IS NULL`,
        [auth.userId, scope],
      );
      await query(
        `INSERT INTO consent_records (user_id, scope, version, granted_at)
         VALUES ($1, $2, $3, NOW())`,
        [auth.userId, scope, def.version],
      );
    } else {
      await query(
        `UPDATE consent_records
         SET revoked_at = NOW()
         WHERE user_id = $1 AND scope = $2 AND revoked_at IS NULL`,
        [auth.userId, scope],
      );
    }

    await addAudit({
      action: granted ? "CONSENT_GRANTED" : "CONSENT_WITHDRAWN",
      userId: auth.userId,
      role: auth.role,
      details: { scope, version: def.version },
    });

    return ok({ scope, granted });
  } catch (e) {
    return fail("DB_ERROR", (e as Error).message, 500);
  }
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  windowMs: 60_000,
  maxRequests: 30,
});
export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 20,
});
