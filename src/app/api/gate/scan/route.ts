import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { recordScan } from "@/server/services/scan/record";
import { ok, fail } from "@/server/http/response";
import { AppError } from "@/server/http/errors";
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
  /**
   * Chosen entry type for an IN scan (hosteller | day_scholar). Required by
   * recordScan on IN scans; the operator UI sends the canonical type after the
   * operator picks an entry button. Omitted on OUT scans (the scope check
   * reads the stored current_entry_type instead).
   */
  entryType?: "hosteller" | "day_scholar";
}

export const POST = withRateLimit(
  withAuthorization(
    async (req: NextRequest, { auth }: { auth: AuthContext }) => {
      const csrf = assertCsrf(req);
      if (csrf) return csrf;

      const body = (await req.json().catch(() => null)) as ScanBody | null;
      if (!body?.direction) {
        return fail("BAD_REQUEST", "direction is required", 400);
      }

      // gateId is a hint: when absent, fall back to the caller's bound gate.
      const gateId = body.gateId ?? auth.gateId ?? null;
      if (!gateId) {
        return fail("BAD_REQUEST", "gateId is required", 400);
      }

      // clientEventId must be a UUID for the Postgres process_gate_scan
      // function; normalise non-UUID values (e.g. test IDs) to a fresh UUID.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const clientEventId = UUID_RE.test(body.clientEventId || "")
        ? body.clientEventId
        : crypto.randomUUID();

      try {
        const result = await recordScan({
          roll: body.roll,
          personId: body.personId,
          direction: body.direction,
          reason: body.reason,
          gateId,
          isManual: body.isManual,
          clientEventId,
          geo: body.geo,
          entryType: body.entryType,
          operatorId: auth.userId,
          operatorName: auth.email,
          operatorRole: auth.role,
          operatorGateId: auth.gateId ?? null,
          supervisedGates: auth.supervisedGates,
        });
        return ok({ ...result, scan: result.log });
      } catch (err) {
        if (err instanceof AppError) {
          return fail(err.code, err.message, err.status, err.details);
        }
        console.error("recordScan unexpected error:", err);
        return fail("INTERNAL_ERROR", "Failed to record scan", 500);
      }
    },
    { requiredRole: TIER.OPERATOR },
  ),
  { keyPrefix: "gate_scan", maxRequests: 30, windowMs: 60_000 },
);
