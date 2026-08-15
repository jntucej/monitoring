import { NextRequest, NextResponse } from "next/server";
import { findPass, approvePass, rejectPass } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params;
  const pass = findPass(passId);
  if (!pass) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: pass });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  try {
    const { passId } = await params;
    const body = await req.json();
    const { action, by = "admin", comment = "", approverId } = body;

    const pass = findPass(passId);
    if (!pass) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } }, { status: 404 });
    }

    let result;
    if (action === "approve") {
      result = approvePass(passId, by, comment, approverId);
    } else if (action === "reject") {
      if (!comment) {
        return NextResponse.json({ success: false, error: { code: "MISSING_COMMENT", message: "Comment is required for rejection" } }, { status: 400 });
      }
      result = rejectPass(passId, by, comment);
    } else {
      return NextResponse.json({ success: false, error: { code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'" } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update pass" } },
      { status: 500 }
    );
  }
}