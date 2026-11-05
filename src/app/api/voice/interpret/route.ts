import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { parseVoiceCommand } from "@/lib/voice";
import { withMutationGuard } from "@/server/http/mutation-guard";

async function handlePost(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(err("BAD_REQUEST", "Missing or invalid text field").body, { status: 400 });
    }

    const command = parseVoiceCommand(text);
    return NextResponse.json({ success: true, data: command });
  } catch (error) {
    return NextResponse.json(err("INTERNAL_ERROR", error instanceof Error ? errMsg(error) : "Internal error").body, { status: 500 });
  }
}
export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin", "operator", "supervisor"], rateLimit: { keyPrefix: "voice_interpret", maxRequests: 60 }});
