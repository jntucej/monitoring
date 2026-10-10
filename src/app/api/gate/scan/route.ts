import { NextRequest, NextResponse } from "next/server"
import { addScan, isDuplicate, findUserById, findGateById, getActiveLockdown } from "@/lib/db"
import { withAuthorization } from "@/middleware/authorization"
import { withRateLimit } from "@/lib/rate-limit"
import { validateRollNumber } from "@/lib/rollNumber"
import type { ScanDirection, ExitReason } from "@/lib/types"

import { logAuditEvent } from "@/lib/audit"

// Haversine formula to calculate distance between two GPS coordinates (in meters)
function distanceBetweenCoords(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Back Gate coordinates (configurable via environment variables or DB gate record)
const DEFAULT_BACK_GATE_COORDS = {
  latitude: parseFloat(process.env.BACK_GATE_LATITUDE || "0"),
  longitude: parseFloat(process.env.BACK_GATE_LONGITUDE || "0"),
  allowedRadiusMeters: parseInt(process.env.BACK_GATE_RADIUS_METERS || "200", 10),
};

// Check if operator's geolocation is near the Back Gate
async function verifyBackGateLocation(
  gateId: string,
  geo: { latitude?: number | null; longitude?: number | null; accuracy?: number | null } | undefined,
  operatorId: string
): Promise<{ allowed: boolean; error?: string }> {
  const gate = await findGateById(gateId);
  if (!gate || gate.gateCode !== "BACK") {
    return { allowed: true };
  }

  if (!geo?.latitude || !geo?.longitude) {
    console.warn(`Back Gate scan by operator ${operatorId} without geolocation data`);
    return {
      allowed: true,
      error: "WARNING: No geolocation data provided. Back Gate scan recorded but verification skipped.",
    };
  }

  const targetCoords = gate.latitude && gate.longitude 
    ? { latitude: gate.latitude, longitude: gate.longitude, allowedRadiusMeters: gate.allowedRadiusMeters || 200 }
    : DEFAULT_BACK_GATE_COORDS;

  // Skip geolocation comparison if coordinates are not configured (0,0)
  if (!targetCoords.latitude || !targetCoords.longitude) {
    return { allowed: true };
  }

  const distance = distanceBetweenCoords(
    geo.latitude,
    geo.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  );

  if (distance > targetCoords.allowedRadiusMeters) {
    return {
      allowed: false,
      error: `Geo-location mismatch: Operator is ${Math.round(distance)}m away from Back Gate. Must be within ${targetCoords.allowedRadiusMeters}m.`,
    };
  }

  return { allowed: true };
}


interface ScanBody {
  roll?: string
  personId?: string
  direction?: ScanDirection
  scanType?: string
  reason?: ExitReason
  gateId: string
  operatorId?: string
  isManual?: boolean
  clientEventId?: string
  local_id?: string
  id?: string
  sysTag?: string
  geo?: { latitude?: number | null; longitude?: number | null; accuracy?: number | null }
}

async function handlePost(req: NextRequest) {
  try {
    // Check Emergency Campus Lockdown
    const activeLockdown = await getActiveLockdown();
    if (activeLockdown) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCKDOWN_ACTIVE",
            message: `Campus lockdown active (${activeLockdown.message || "Emergency Lockdown Enforced"}). All gate scans are blocked.`,
          },
        },
        { status: 403 }
      );
    }

    // CSRF Protection: Verify Host matches Origin for state-changing requests
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (process.env.NODE_ENV !== "development" && origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "CSRF verification failed: Cross-Origin request blocked." } },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "CSRF verification failed: Invalid origin format." } },
          { status: 403 }
        );
      }
    }

    const body: ScanBody = await req.json()
    const authOperatorId = req.headers.get("x-user-id")
    const authRole = req.headers.get("x-user-role")

    let roll = body.roll || body.personId;
    if (typeof roll === "string" && roll.trim().startsWith("{") && roll.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(roll.trim());
        roll = parsed.uniqueId || parsed.unique_id || parsed.roll || parsed.id || parsed.personId || roll;
      } catch {}
    }

    const rawDir = body.direction || body.scanType;
    let direction: ScanDirection = "IN";
    if (rawDir) {
      const u = String(rawDir).toUpperCase();
      if (u === "ENTRY" || u === "IN") direction = "IN";
      else if (u === "EXIT" || u === "OUT") direction = "OUT";
    }

    const { reason, gateId, isManual } = body
    const clientEventId = body.clientEventId || body.local_id || body.id

    // Use authenticated operator ID from request context (prevent operator forgery)
    const operatorId = authOperatorId || body.operatorId

    if (!roll || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      )
    }

    // Input Validation: Check roll number / identifier format
    const cleanRoll = roll.trim().toUpperCase();
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRoll);
    const isEmployeeIdLike = /^[A-Z0-9_-]{3,24}$/i.test(cleanRoll);
    const isVisitorIdLike = /^(VIS|VISITOR|V)[-_][A-Z0-9_-]{2,28}$/i.test(cleanRoll);
    if (!validateRollNumber(cleanRoll) && !isUuidLike && !isEmployeeIdLike && !isVisitorIdLike) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid identifier format" } },
        { status: 400 }
      );
    }

    // Verify operator ↔ gate assignment for operators
    if (authRole === "operator" && authOperatorId) {
      const op = await findUserById(authOperatorId)
      if (op && op.gateId) {
        // Resolve canonical gate records for both IDs to compare them properly
        const [opGate, reqGate] = await Promise.all([
          findGateById(op.gateId),
          findGateById(gateId)
        ])
        if (opGate && reqGate && opGate.id !== reqGate.id) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "Operator not assigned to this gate" } },
            { status: 403 }
          )
        }
      }
    }

    // BACK GATE: Auto-assign based on geolocation
    if (body.geo) {
      const geoCheck = await verifyBackGateLocation(gateId, body.geo, operatorId);
      if (!geoCheck.allowed) {
        await logAuditEvent({
          action: "BACK_GATE_GEO_MISMATCH",
          userId: operatorId,
          userName: `Operator ${operatorId}`,
          userRole: authRole || "operator",
          details: { gateId, requestedGeo: body.geo, error: geoCheck.error },
        });
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "GEOLOCATION_MISMATCH",
              message: geoCheck.error || "Operator not at Back Gate location",
              distance: Math.round(distanceBetweenCoords(
                body.geo.latitude!,
                body.geo.longitude!,
                DEFAULT_BACK_GATE_COORDS.latitude,
                DEFAULT_BACK_GATE_COORDS.longitude
              )),
            },
          },
          { status: 403 }
        );
      }
      if (geoCheck.error) {
        console.warn(geoCheck.error);
      }
    }

    const duplicate = await isDuplicate(roll, direction, 5)
    if (duplicate) {
      return NextResponse.json(
        { success: false, duplicate: true, error: "Duplicate scan detected", message: "Duplicate scan detected" },
        { status: 409 }
      )
    }

    const result = await addScan({
      roll,
      direction,
      reason,
      gateId,
      operatorId,
      isManual: isManual ?? false,
      clientEventId,
    })

    // Log SysTag & GPS Geolocation event for SysAdmin audit stream
    try {
      await logAuditEvent({
        action: "GATE_SCAN_RECORDED",
        userId: operatorId,
        userName: `Operator ${operatorId}`,
        userRole: authRole || "operator",
        details: {
          roll,
          direction,
          gateId,
          sysTag: body.sysTag || `SYS_TAG_SCAN_${Date.now()}`,
          geo: body.geo || null,
          isManual: isManual ?? false,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json(
      { success: true, duplicate: result.duplicate, scan: result.scan },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing scan:", error)
    const message = error instanceof Error ? error.message : "Failed to process scan"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin", "supervisor"] }),
  { keyPrefix: "gate_scan", maxRequests: 60 }
)

