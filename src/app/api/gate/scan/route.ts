import { NextRequest, NextResponse } from "next/server"
import { addScan, isDuplicate, findUserById } from "@/lib/db"
import { withAuthorization } from "@/middleware/authorization"
import { withRateLimit } from "@/lib/rate-limit"
import type { ScanDirection, ExitReason } from "@/lib/types"

interface ScanBody {
  roll: string
  direction: ScanDirection
  reason?: ExitReason
  gateId: string
  operatorId?: string
  isManual?: boolean
  clientEventId?: string
  local_id?: string
  id?: string
}

async function handlePost(req: NextRequest) {
  try {
    // CSRF Protection: Verify Host matches Origin for state-changing requests
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
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
    const { roll, direction, reason, gateId, isManual } = body
    const clientEventId = body.clientEventId || body.local_id || body.id

    // Use authenticated operator ID from request context (prevent operator forgery)
    const operatorId = authOperatorId || body.operatorId

    if (!roll || !direction || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      )
    }

    // Verify operator ↔ gate assignment for operators
    if (authRole === "operator" && authOperatorId) {
      const op = await findUserById(authOperatorId)
      if (op && op.gateId && op.gateId !== gateId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Operator not assigned to this gate" } },
          { status: 403 }
        )
      }
    }

    const duplicate = await isDuplicate(roll, direction)
    if (duplicate) {
      return NextResponse.json(
        { success: true, duplicate: true, message: "Duplicate scan detected" },
        { status: 200 }
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
  withAuthorization(handlePost, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "gate_scan", maxRequests: 60 }
)

