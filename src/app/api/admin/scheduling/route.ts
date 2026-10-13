// src/app/api/admin/scheduling/route.ts
// SCAFFOLD:RICH-API — GET list + POST apply. Compliance-baked:
//   withAuthorization → assertCsrf → rate-limit → handler.
//   Standard ok()/fail() envelope; no raw NextResponse.json.
//   requireTrustedHeaders guards against identity spoofing.
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { assertCsrf } from "@/lib/csrf";
import { addAudit } from "@/lib/db";
import { assertLength } from "@/lib/validation";
import { RATE_LIMITS } from "@/config/app-constants";
import { generateScheduleSuggestions, applyScheduleSuggestion } from "@/lib/scheduling-assistant";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ALLOWED: Role[] = ["sysadmin", "admin"];

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;
  void auth;

  const suggestions = await generateScheduleSuggestions();
  return ok({
    suggestions,
    generatedAt: new Date().toISOString(),
    model: { name: "heuristic-v1", version: "1.0.0", samples: suggestions.length },
  });
}
export const GET = withAuthorization(handleGet, {
  requiredRole: ALLOWED,
  rateLimit: RATE_LIMITS.read,
} as never);

async function handlePost(_req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const csrf = assertCsrf(_req);
  if (csrf) return csrf;

  let body: unknown;
  try { body = await _req.json(); }
  catch { return fail("INVALID_JSON", "body must be JSON", 400); }
  if (!body || typeof body !== "object") return fail("INVALID_BODY", "body must be an object", 400);

  const { suggestionId } = body as { suggestionId?: unknown };
  if (typeof suggestionId !== "string") return fail("MISSING_ID", "suggestionId required", 400);
  try { assertLength(suggestionId, 128, "suggestionId"); }
  catch (e) { return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid", 400); }

  const applied = await applyScheduleSuggestion(suggestionId);
  if (!applied) return fail("APPLY_FAILED", "suggestion could not be applied", 422);

  try {
    await addAudit({
      action: "SMART_SCHEDULE_APPLIED",
      userId: auth.userId,
      role: auth.role,
      details: { suggestionId },
    });
  } catch { /* non-fatal */ }

  return ok({ applied: true });
}
export const POST = withAuthorization(handlePost, {
  requiredRole: ALLOWED,
  rateLimit: RATE_LIMITS.mutation,
} as never);
