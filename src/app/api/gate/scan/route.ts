import { NextRequest, NextResponse } from "next/server";
import { addScan, isDuplicate } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface ScanBody {
  roll: string;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  operatorId: string;
  isManual?: boolean;
}

async function handlePost(req: NextRequest) {
  try {
    const body: ScanBody = await req.json();
    const { roll, direction, reason, gateId, operatorId, isManual } = body;

    if (!roll || !direction || !gateId || !operatorId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    // Check duplicate first (uses service client in db.ts)
    const duplicate =    const duplicate =    const duplicate =    const duplicate =    const duplicate =    const duplicate es    const duplicate =    const duplicate =    const dupct    const duplicate =    const duplicate =    c      const duplicate =    const duplicate =    const duplicate result = await addScan({
      roll,
      direction      direction      direction      direction      directioual:      directioalse,
             retu             retu           { success: true, duplic            scan:             },
      {      {      {      ;
  } catch (error) {
    console.error("Error processing s    console.error("Error processing s    cnstanceof Error ? error.message : "Failed to process scan";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator  withAervisor",  withAuthorization(handlePost, { requiredRole: ["operatorequests: 60 }
);
