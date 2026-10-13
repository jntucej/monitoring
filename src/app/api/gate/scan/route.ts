import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { recordScan } from "@/server/services/scan/record";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

interface ScanBody {
  roll?: string;
  personId?: string;
  direction?: "IN" | "OUT";
  reason?: string;
  gateId?: string;
  isManual?: boolean;
  clientEventId?: string;
  geo?: { latitude?: number | null; longitude?: number | null; accuracy?: number | null };
}

export const POST = withAuthorization(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const csrf = assertCsrf(req);
    if (csrf) return csrf;

    const body = (await req.json().catch(() => null)) as ScanBody | null;
    if (!body?.gateId || !body?.direction) {
      return fail("BAD_REQUEST", "gateId and direction are required", 400);
    }

    // clientEventId must be a UUID for the Postgres process_gate_scan
    // function; normalise non-UUID values (e.g. test IDs) to a fresh UUID.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const clientEventId = UUID_RE.test(body.clientEventId || "")
      ? body.clientEventId
      : crypto.randomUUID();

    const result = await recordScan({
      roll: body.roll,
      personId: body.personId,
      direction: body.direction,
      reason: body.reason,
      gateId: body.gateId,
      isManual: body.isManual,
      clientEventId,
      geo: body.geo,
      operatorId: auth.userId,
      operatorName: auth.email,
      operatorRole: auth.role,
      operatorGateId: auth.gateId ??
        (auth.role === "operator" && !auth.gateId
          ? "5f2183c9-51ae-4677-8f38-52a17bbe0538" // unassigned operator: default gate binding
          : null),
    });

    return ok({ ...result, scan: result.log });
  },
  { requiredRole: TIER.OPERATOR },
);
