import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { recordScan } from "@/server/services/scan/record";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Standard HTTP Push / ADMS endpoint for biometric terminals (H0201 derivatives, ZKTeco ADMS).
 * Biometric terminals configured with ADMS/Push server post real-time attendance logs via HTTP POST.
 *
 * Header: X-Device-Token or Authorization: Bearer <DEVICE_PUSH_SECRET>
 * Body format (JSON or form-urlencoded):
 * {
 *   "device_serial": "1241920440010",
 *   "device_user_id": "101",
 *   "direction": "IN" | "OUT",
 *   "timestamp": "2026-10-30T08:30:00Z",
 *   "gate_id": "uuid-optional"
 * }
 */
async function handlePost(req: NextRequest) {
  const authHeader = req.headers.get("x-device-token") || req.headers.get("authorization");
  const configuredSecret = process.env.DEVICE_PUSH_SECRET || process.env.INTERNAL_MW_SECRET;

  if (configuredSecret) {
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (token !== configuredSecret) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED_DEVICE" }, { status: 401 });
    }
  }

  let body: any;
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => null);
  } else {
    const text = await req.text().catch(() => "");
    const params = new URLSearchParams(text);
    body = Object.fromEntries(params.entries());
  }

  if (!body) {
    return NextResponse.json({ success: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const deviceSerial = String(body.device_serial || body.SN || body.sn || "").trim();
  const deviceUserId = String(body.device_user_id || body.PIN || body.pin || "").trim();
  const direction = (String(body.direction || (body.status === "1" ? "OUT" : "IN")).toUpperCase() === "OUT") ? "OUT" : "IN";

  if (!deviceSerial || !deviceUserId) {
    return NextResponse.json(
      { success: false, error: "device_serial and device_user_id are required" },
      { status: 400 }
    );
  }

  // 1. Resolve mapping from device_user_mappings
  const { rows: mappings } = await query<{
    user_id: string;
    unique_id: string;
    role: string;
    gate_id: string | null;
  }>(
    `SELECT m.user_id, u.unique_id, u.role, g.id AS gate_id
       FROM public.device_user_mappings m
       JOIN public.users u ON u.id = m.user_id
       LEFT JOIN public.gates g ON g.id = (
         SELECT gate_id FROM public.device_verification_settings WHERE scope_id = m.device_serial LIMIT 1
       )
      WHERE m.device_serial = $1
        AND m.device_user_id = $2
        AND m.is_active = TRUE
      LIMIT 1`,
    [deviceSerial, deviceUserId]
  );

  const mapped = mappings[0];
  if (!mapped) {
    return NextResponse.json(
      { success: false, error: "UNMAPPED_DEVICE_USER", message: `No active user mapping for device ${deviceSerial} user ${deviceUserId}` },
      { status: 404 }
    );
  }

  // 2. Resolve gate: body.gate_id -> mapped.gate_id -> active default gate
  let targetGateId = body.gate_id || mapped.gate_id;
  if (!targetGateId) {
    const { rows: defaultGate } = await query<{ id: string }>(
      `SELECT id FROM public.gates WHERE is_active = TRUE ORDER BY CASE WHEN upper(gate_code) = 'MAIN' THEN 1 ELSE 2 END ASC LIMIT 1`
    );
    targetGateId = defaultGate[0]?.id;
  }

  if (!targetGateId) {
    return NextResponse.json({ success: false, error: "NO_ACTIVE_GATE" }, { status: 400 });
  }

  // 3. System operator identity for biometric device push
  const { rows: op } = await query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM public.users WHERE is_kiosk_default = TRUE LIMIT 1`
  );
  const operator = op[0] ?? {
    id: "00000000-0000-0000-0000-000000000001",
    email: "biometric-terminal@college.edu",
    role: "operator",
  };

  try {
    const scanResult = await recordScan({
      personId: mapped.user_id,
      roll: mapped.unique_id,
      direction,
      gateId: targetGateId,
      isManual: false,
      operatorId: operator.id,
      operatorName: `Biometric Terminal ${deviceSerial}`,
      operatorRole: operator.role,
      operatorGateId: targetGateId,
    });

    return NextResponse.json({
      success: true,
      message: "Biometric push scan recorded",
      data: scanResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.code ?? "SCAN_REJECTED", message: err.message },
      { status: err.status ?? 400 }
    );
  }
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "biometric_device_push",
  maxRequests: 300,
  windowMs: 60_000,
});
