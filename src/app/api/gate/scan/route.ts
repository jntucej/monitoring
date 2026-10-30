import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { recordScan } from "@/server/services/scan/record";
import { ok } from "@/server/http/response";
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
      return ok({ error: "gateId and direction are required" });
    }

    const result = await recordScan({
      roll: body.roll,
      personId: body.personId,
      direction: body.direction,
      reason: body.reason,
      gateId: body.gateId,
      isManual: body.isManual,
      clientEventId: body.clientEventId,
      geo: body.geo,
      operatorId: auth.userId,
      operatorName: auth.email,
      operatorRole: auth.role,
      operatorGateId: auth.gateId ?? null,
    });

    return ok({ ...result, scan: result.log });
  },
  { requiredRole: ["operator"] },
);
