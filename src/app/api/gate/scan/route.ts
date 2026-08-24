import { NextRequest, NextResponse } from "next/server"
import { addScan, isDuplicate } from "@/lib/db"
import { withAuthorization } from "@/middleware/authorization"
import { withRateLimit } from "@/lib/rate-limit"
import type { ScanDirection, ExitReason } from "@/lib/types"

interface ScanBody {
  roll: string
  direction: ScanDirection
  reason?: ExitReason
  gateId: string
  operatorId: string
  isManual?: boolean
}

async function handlePost(req: NextRequest) {
  try {
    const body: ScanBody = await req.json()
    const authOperatorId = req.headers.get("x-user-id")
    const { roll, direction, reason, gateId, isManual } = body
    const operatorId = authOperatorId || body.operatorId

    if (!roll || !direction || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      )
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
    })

    return NextResponse.json(
      { success: true, duplicate: false, scan: result.scan },
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

