import { NextRequest, NextResponse } from "next/server";
import { generateQrToken } from "@/lib/qr-token";
import { withAuthorization } from "@/middleware/authorization";
import { findUserById } from "@/lib/db";

async function handleGet(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "User not authenticated" } },
        { status: 401 }
      );
    }

    const user = await findUserById(userId);
    if (!user || !user.studentDetails?.roll) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only students can generate QR tokens" } },
        { status: 403 }
      );
    }

    const qrToken = await generateQrToken(user.studentDetails.roll, user.id);
    return NextResponse.json({ success: true, data: { qrToken } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to generate QR token" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: "student" });
