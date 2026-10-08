import { NextRequest, NextResponse } from "next/server";
import { validateMobileToken } from "@/lib/mobile-auth";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceId = req.headers.get("x-device-id") || undefined;
  const token = authHeader.split(" ")[1];
  const person = await validateMobileToken(token, deviceId);

  if (!person) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.json({
    uniqueId: person.uniqueId,
    fullName: person.fullName,
    personType: person.personType,
    department: person.department,
    designation: person.designation,
    photoUrl: person.photoUrl,
    qrCode: person.qrCode,
    status: person.status,
  });
}

export const GET = withRateLimit(handleGet, {
  keyPrefix: "mobile_idcard",
  maxRequests: 30,
  windowMs: 60 * 1000,
});
