import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { parseVoiceCommand } from "@/lib/voice";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(err("BAD_REQUEST", "Missing or invalid text field").body, { status: 400 });
    }

    const command = parseVoiceCommand(text);
    return NextResponse.json({ success: true, data: command });
  } catch (error: any) {
    return NextResponse.json(err("INTERNAL_ERROR", error instanceof Error ? error.message : "Internal error").body, { status: 500 });
  }
}
export const POST = withRateLimit(withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "operator", "supervisor"] }), { keyPrefix: "voice_interpret", maxRequests: 60 });
