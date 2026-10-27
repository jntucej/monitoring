import { NextResponse } from "next/server";
import { getGateMode } from "@/lib/gate-operations";

export async function GET() {
  const mode = await getGateMode();
  return NextResponse.json({
    success: true,
    data: {
      mode,
      timestamp: new Date().toISOString(),
    },
  });
}
