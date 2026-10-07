import { NextRequest, NextResponse } from "next/server";
import { parseVoiceCommand } from "@/lib/voice";

export async function POST(req: NextRequest) {
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