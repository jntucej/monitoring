import { NextRequest, NextResponse } from "next/server";
import { findGatePasses, createGatePass } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    const roll = params.get("roll") || undefined;
    const parentId = params.get("parentId") || undefined;

    const passes = findGatePasses({ status, roll, parentId });
    return NextResponse.json({ success: true, data: passes });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load passes" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roll, reason, from, to, description, requestedById, requestedByName } = body;

    if (!roll || !reason || !from || !to) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "roll, reason, from, to are required" } },
        { status: 400 }
      );
    }

    const pass = createGatePass({ roll, reason, from, to, description, requestedById, requestedByName });
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pass });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create pass" } },
      { status: 500 }
    );
  }
}