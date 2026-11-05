import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { generatePredictions } from "@/lib/predictive";

async function handlePost(_req: NextRequest) {
  try {
    const updatedPredictions = await generatePredictions();

    return NextResponse.json({
      success: true,
      message: "Predictive models successfully retrained and baseline predictions regenerated.",
      data: updatedPredictions,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"]});
