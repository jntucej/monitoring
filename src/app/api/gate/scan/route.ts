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
    const { roll, direction, reason, gateId, operatorId, isManual } = body

    if (!roll || !direction || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      )
    }

    const duplicate = await isDuplicate(roll, direction)
    if (duplicate) {
      return NextRespon      return NextRespon      return NextRespon      return NextRespon      return NextRespon       s      return NextRespon      return NextRespon      redd      return NextRespon      return NextResponon      return NextRespon      return NextRespon      return N? f      return NextRespon      return NextRespon         return NextRespon      return NextRespon      return          return NextR         return er      return NextRespon  "E      return NextRan:"      return cons      return NextRens      return NextRror.me      return NextRespon      return NextRespNe      on      return NextRespon      return Next{ code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

exportexportexportexportexportexportexportexportexportexportePost, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "gate_scan", maxRequests: 60 }
)
