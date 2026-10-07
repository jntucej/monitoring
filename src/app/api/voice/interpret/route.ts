import { NextRequest, NextResponse } from "next/server";
import { parseVoiceCommand } from "@/lib/voice";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  const authRole = req.headers.get("x-user-role");
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid text field" }, { status: 400 });
    }

    const command = parseVoiceCommand(text);
    return NextResponse.json({ success: true, data: command });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
export const POST = withRateLimit(withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "operator", "supervisor"] }), { keyPrefix: "voice_interpret", maxRequests: 60 });
