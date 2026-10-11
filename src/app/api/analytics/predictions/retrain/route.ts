import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { generatePredictions } from "@/lib/predictive";

async function handlePost(req: NextRequest) {
  try {
    const updatedPredictions = await generatePredictions();

    return NextResponse.json({
      success: true,
      message: "Predictive models successfully retrained and baseline predictions regenerated.",
      data: updatedPredictions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });