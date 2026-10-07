import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { generateScheduleSuggestions } from "@/lib/scheduling-assistant";

async function handleGet(req: NextRequest) {
  try {
    const suggestions = await generateScheduleSuggestions();
    return NextResponse.json({ success: true, data: suggestions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });