import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { verifyQrToken, verifyManualCode, serveToken, type VerifyResult, type VerifyFailure } from "@/lib/mess-event-token";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);

function eventIdFromUrl(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("verify");
  return i > 1 ? parts[i - 2] : "";
}

interface Body {
  mode?: "QR" | "MANUAL";
  qrToken?: string;
  roll?: string;
  manualCode?: string;
  serve?: boolean;
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role))
    return fail("FORBIDDEN", "Only mess in-charge can verify tokens", 403);
  const eventId = eventIdFromUrl(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || (body.mode !== "QR" && body.mode !== "MANUAL"))
    return fail("VALIDATION_ERROR", "mode must be QR or MANUAL", 400);

  let result: VerifyResult | VerifyFailure;
  if (body.mode === "QR") {
    if (!body.qrToken) return fail("VALIDATION_ERROR", "qrToken required", 400);
    result = await verifyQrToken(body.qrToken);
  } else {
    if (!body.roll || !body.manualCode)
      return fail("VALIDATION_ERROR", "roll and manualCode required", 400);
    result = await verifyManualCode(body.roll, body.manualCode);
  }

  if (!result.ok) {
    await addAudit({
      action: "MESS_TOKEN_VERIFY_FAILED",
      userId: auth.userId,
      role: auth.role,
      details: { eventId, mode: body.mode, code: result.code, roll: body.roll ?? null },
    });
    return fail(result.code, result.message, 400);
  }

  // Verify succeeded; if caller wants to consume, do it atomically.
  if (!body.serve) {
    await addAudit({
      action: "MESS_TOKEN_VERIFIED",
      userId: auth.userId,
      role: auth.role,
      details: { eventId, tokenId: result.tokenId, method: result.method },
    });
    return ok({ result, served: false });
  }

  const served = await serveToken(result.tokenId, auth.userId, result.method);
  if (!served.ok) {
    return fail(served.code, served.message, 409);
  }
  await addAudit({
    action: "MESS_TOKEN_SERVED",
    userId: auth.userId,
    role: auth.role,
    details: {
      eventId, tokenId: served.tokenId, method: served.method,
      studentId: served.userId, studentRoll: served.uniqueId,
      itemCount: served.itemIds.length,
    },
  });
  return ok({ result: served, served: true });
}

export const POST = withAuthorization(
  withRateLimit(handlePost, { windowMs: 60_000, maxRequests: 120 }),
  {},
);
