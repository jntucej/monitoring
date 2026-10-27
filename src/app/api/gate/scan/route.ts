import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, rateLimitByKey } from "@/lib/rate-limit";
import { recordScan } from "@/server/services/scan/record";
import { query } from "@/lib/postgres";
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

      // Resolve the caller's CURRENT gate fresh from the DB. The JWT-embedded
      // auth.gateId is minted at login and can go stale: an operator who just
      // claimed a gate (POST /api/operator/claim-gate) has a fresh users.gate_id
      // that is NOT yet in their access token. Trust the DB value first, fall
      // back to the JWT value only if the DB row has no gate yet.
      const dbGate = await query<{ gate_id: string | null }>(
        "SELECT gate_id FROM public.users WHERE id = $1 LIMIT 1",
        [auth.userId]
      ).catch(() => null);
      const freshGateId = dbGate?.rows[0]?.gate_id ?? auth.gateId;

      // gateId is a hint: when absent, fall back to the caller's bound gate.
      const gateId = body.gateId ?? freshGateId ?? null;
      if (!gateId) {
        return fail("BAD_REQUEST", "gateId is required", 400);
      }

      // Per-operator+gate rate limit (NOT keyed by client IP).
      //
      // The outer withRateLimit wrapper keys by client IP and is raised to a
      // high global ceiling so it only trips during an actual DoS burst.
      // Real operational load is bounded per-operator: a human at one kiosk
      // tops out at ~0.3 scans/sec (~20/min). Allowing 300/min per operator
      // gives ~16x headroom over human pace while still protecting the DB
      // from a runaway kiosk client or an authenticated but misbehaving
      // caller. Multiple operators behind one campus NAT each get their own
      // bucket instead of sharing a single 60/min IP bucket.
      {
        // Stable key per operator+gate (no minute bucket): the store's 60s
        // sliding window then bounds the rate to 300/min continuously rather
        // than resetting every wall-clock minute (which would allow a 300 +
        // 300 burst straddling a minute boundary).
        const rl = await rateLimitByKey(
          `gate_scan_op:${auth.userId}:${gateId}`,
          { windowMs: 60_000, maxRequests: 300 }
        );
        if (rl.limited) {
          return fail(
            "RATE_LIMIT_EXCEEDED",
            "Scan rate limit exceeded for this operator and gate",
            429,
            { retryAfter: rl.retryAfter ?? 60 }
          );
        }
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
          operatorGateId: freshGateId ?? null,
          supervisedGates: auth.supervisedGates,
        });
        // Attach the consumed pass (if any) to the scan response so the gate
        // UI can show which ticket was used by this OUT scan.
        const pass = result.consumedPassId
          ? await query(
              `SELECT id, ticket_number, reason, used_at FROM public.permissions WHERE id = $1 LIMIT 1`,
              [result.consumedPassId],
            )
          : null;
        const passRow = pass?.rows[0] ?? null;
        return ok({ ...result, scan: result.log, pass: passRow });
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
  // Outer IP-keyed guard: high global ceiling so it only trips on an actual
  // DoS burst from one client IP, never on legitimate multi-kiosk campus
  // traffic (which is bounded per-operator+gate inside the handler).
  { keyPrefix: "gate_scan", maxRequests: 5_000, windowMs: 60_000 },
);
